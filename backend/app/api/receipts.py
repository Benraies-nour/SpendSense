from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.category import Category
from app.models.expense import Expense, ExpenseSource
from app.models.receipt import Receipt, ReceiptItem
from app.models.user import User
from app.schemas.receipt import ReceiptRead, ReceiptItemRead, ReceiptDraft, DraftItem, ReceiptConfirm

router = APIRouter(prefix="/receipts", tags=["receipts"])


class BudgetAlert(BaseModel):
    category_id: int
    category_name: str
    budget_amount: Decimal
    spent: Decimal
    over_by: Decimal  


class ConfirmResponse(BaseModel):
    receipt: ReceiptRead
    expenses_created: int
    budget_alerts: list[BudgetAlert]



ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/bmp",
    "image/tiff", "image/heif", "application/pdf",
}
MAX_FILE_SIZE = 4 * 1024 * 1024  


@router.get("/", response_model=list[ReceiptRead])
def get_receipts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session.exec(select(Receipt).where(Receipt.user_id == current_user.id)).all()


@router.get("/{receipt_id}", response_model=ReceiptRead)
def get_receipt(
    receipt_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    receipt = session.get(Receipt, receipt_id)
    if not receipt or receipt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Receipt not found.")

    items_read = [
        ReceiptItemRead(
            id=it.id,
            receipt_id=it.receipt_id,
            name=it.name,
            quantity=it.quantity,
            total_price=it.total_price,
            category_id=it.category_id,
        )
        for it in session.exec(
            select(ReceiptItem).where(ReceiptItem.receipt_id == receipt.id)
        ).all()
    ]

    return ReceiptRead(
        id=receipt.id,
        user_id=receipt.user_id,
        purchased_at=receipt.purchased_at,
        total=receipt.total,
        items=items_read,
    )


@router.post("/scan", response_model=ReceiptDraft)
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Analyze a receipt image and return a draft (nothing is saved to the database).

    The client displays the draft for the user to review, then calls
    POST /receipts/confirm to save the validated data.
    """
    # --- Validate file type and size ---
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Accepted: JPEG, PNG, BMP, TIFF, HEIF, PDF.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(image_bytes) // 1024} KB). Maximum is 4 MB.",
        )

    # --- Call Azure OCR ---
    from app.services.ocr import analyze_receipt

    try:
        ocr_result = analyze_receipt(image_bytes)
    except PermissionError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except RuntimeError as e:
        if "quota" in str(e).lower():
            raise HTTPException(status_code=429, detail=str(e))
        raise HTTPException(status_code=502, detail=str(e))

    # --- Fallback: extract items from raw text when Azure found none ---
    extraction_method = "ocr"
    items = ocr_result.items

    if not items and ocr_result.raw_text:
        from app.services.extraction import extract_items_from_text
        try:
            extracted = extract_items_from_text(ocr_result.raw_text)
            if extracted:
                items = extracted
                extraction_method = "llm_fallback"
        except (RuntimeError, ConnectionError):
            pass  # fallback failed — return empty items, user enters them manually

    if not items and not ocr_result.raw_text:
        raise HTTPException(
            status_code=422,
            detail="No items could be extracted from this image. "
                   "Please try a clearer photo.",
        )

    # --- Build draft items (category_id is always null here) ---
    draft_items = [
        DraftItem(
            name=item.name,
            quantity=item.quantity,
            total_price=item.total_price,
            category_id=None,
        )
        for item in items
    ]

    computed_total = sum(
        (item.total_price for item in draft_items),
        Decimal("0.000"),
    ).quantize(Decimal("0.001"))

    return ReceiptDraft(
        purchased_at=ocr_result.purchased_at,
        items=draft_items,
        computed_total=computed_total,
        printed_total=ocr_result.printed_total,
        extraction_method=extraction_method,
        ocr_text=ocr_result.raw_text,
    )


@router.post("/confirm", response_model=ConfirmResponse)
def confirm_receipt(
    body: ReceiptConfirm,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Save a validated receipt draft to the database.

    Creates:
      - one Receipt row
      - one ReceiptItem row per item
      - one Expense row per category group (source = receipt)

    Everything is committed in a single transaction — either all rows
    are saved or none are.

    Returns the saved receipt and any budget alerts for exceeded categories.
    """
    # --- Validate items ---
    if not body.items:
        raise HTTPException(status_code=422, detail="At least one item is required.")

    # --- Validate item prices ---
    for item in body.items:
        if item.total_price <= Decimal("0.000"):
            raise HTTPException(
                status_code=422,
                detail=f"Item '{item.name}' has a non-positive price ({item.total_price}).",
            )

    # Verify every category_id belongs to the current user
    user_category_ids = {
        cat.id
        for cat in session.exec(
            select(Category).where(Category.user_id == current_user.id)
        ).all()
    }
    for item in body.items:
        if item.category_id not in user_category_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Category {item.category_id} does not exist or does not belong to you.",
            )

    # --- Compute receipt total ---
    receipt_total = sum(
        (item.total_price for item in body.items), Decimal("0.000")
    ).quantize(Decimal("0.001"))

    # --- Save everything in one transaction ---
    receipt = Receipt(
        user_id=current_user.id,
        purchased_at=body.purchased_at,
        total=receipt_total,
        ocr_raw={"content": body.ocr_text} if body.ocr_text else None,
    )
    session.add(receipt)
    session.flush()  # assign receipt.id without committing yet

    for item in body.items:
        session.add(
            ReceiptItem(
                receipt_id=receipt.id,
                name=item.name,
                quantity=item.quantity,
                total_price=item.total_price,
                category_id=item.category_id,
            )
        )

    expenses: list[Expense] = []
    for item in body.items:
        expense = Expense(
            user_id=current_user.id,
            category_id=item.category_id,
            receipt_id=receipt.id,
            amount=item.total_price,
            description=item.name,
            source=ExpenseSource.receipt,
        )
        session.add(expense)
        expenses.append(expense)

    session.commit()
    session.refresh(receipt)

    # --- Build ReceiptRead with items ---
    items_read = [
        ReceiptItemRead(
            id=it.id,
            receipt_id=it.receipt_id,
            name=it.name,
            quantity=it.quantity,
            total_price=it.total_price,
            category_id=it.category_id,
        )
        for it in session.exec(
            select(ReceiptItem).where(ReceiptItem.receipt_id == receipt.id)
        ).all()
    ]

    receipt_read = ReceiptRead(
        id=receipt.id,
        user_id=receipt.user_id,
        purchased_at=receipt.purchased_at,
        total=receipt.total,
        items=items_read,
    )

    # --- Budget alerts: categories that are now over budget ---
    all_expenses = session.exec(
        select(Expense).where(Expense.user_id == current_user.id)
    ).all()

    alerts: list[BudgetAlert] = []
    for cat in session.exec(
        select(Category).where(Category.user_id == current_user.id)
    ).all():
        if cat.budget_amount <= Decimal("0.000"):
            continue
        spent = sum(
            e.amount for e in all_expenses if e.category_id == cat.id
        )
        if spent > cat.budget_amount:
            alerts.append(
                BudgetAlert(
                    category_id=cat.id,
                    category_name=cat.name,
                    budget_amount=cat.budget_amount,
                    spent=spent,
                    over_by=(spent - cat.budget_amount).quantize(Decimal("0.001")),
                )
            )

    return ConfirmResponse(
        receipt=receipt_read,
        expenses_created=len(expenses),
        budget_alerts=alerts,
    )
