"""
Function-calling tool definitions for Nova.
"""

_PERIODS = {
    "type": "string",
    "enum": ["today", "this_week", "last_week", "this_month", "last_month", "this_year"],
    "description": "Time period for the query.",
}

_CATEGORY_FILTER = {
    "type": "string",
    "description": "Optional category name to filter by.",
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "draft_expense",
            "description": (
                "Prepare an expense draft for the user to confirm before saving. "
                "Call this whenever the user mentions spending, buying, or paying for something. "
                "Always pick the closest category from the user's category list."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "string",
                        "description": "Amount in TND, 3 decimal places. Convert natural speech to this format: 'twenty' → '20.000', '5 dinars' → '5.000'. Never ask the user to format this.",
                    },
                    "description": {
                        "type": "string",
                        "description": "Short description of the expense. Infer from context if obvious (e.g. user says 'coffee' → 'coffee').",
                    },
                    "category_name": {
                        "type": "string",
                        "description": "Category name from the user's available categories.",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format. Use today if not mentioned.",
                    },
                },
                "required": ["amount", "description", "category_name", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_income",
            "description": (
                "Prepare an income draft for the user to confirm before saving. "
                "Call this whenever the user mentions receiving money, being paid, salary, freelance, or a gift."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "string",
                        "description": "Amount in TND, 3 decimal places. Convert natural speech: 'two thousand' → '2000.000'. Never ask the user to format this.",
                    },
                    "source": {
                        "type": "string",
                        "description": "Source of income.",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date received in YYYY-MM-DD format. Use today if not mentioned.",
                    },
                    "is_recurring": {
                        "type": "boolean",
                        "description": "True if this is a recurring income like a monthly salary.",
                    },
                },
                "required": ["amount", "source", "date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "draft_category",
            "description": (
                "Prepare a new budget category for the user to confirm before creating. "
                "Call this when the user wants to add or create a new budget category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Category name.",
                    },
                    "budget_amount": {
                        "type": "string",
                        "description": "Monthly budget in TND with 3 decimal places, e.g. '200.000'",
                    },
                },
                "required": ["name", "budget_amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_summary",
            "description": (
                "Get total expenses, total income, and net savings for a time period. "
                "Use when the user asks how much they spent, earned, saved overall, "
                "or how they are doing financially."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "period": _PERIODS,
                },
                "required": ["period"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_status",
            "description": (
                "Get budget usage per category — how much was spent versus the monthly budget. "
                "Use when the user asks about remaining budget, whether they are over budget, "
                "or how much budget is left in a specific category."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "period":        _PERIODS,
                    "category_name": _CATEGORY_FILTER,
                },
                "required": ["period"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_transactions",
            "description": (
                "List recent expense and income transactions. "
                "Use when the user asks what they bought, what transactions happened recently, "
                "or wants to review their spending history."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "period":        _PERIODS,
                    "category_name": _CATEGORY_FILTER,
                },
                "required": ["period"],
            },
        },
    },
]
