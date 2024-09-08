export const PAGES_URL = {
  DASHBOARD: {
    BASE_PATH: `/dashboard`,
  },
  CREDIT_CARDS: {
    BASE_PATH: `/credit-cards`,
    CREATE: `/credit-cards/create`,
    DETAILS: (id: string) => `/credit-cards/${id}`,
    EDIT: (id: string) => `/credit-cards/${id}/edit`,
    EXPENSE_ITEM: {
      CREATE: (id: string) => `/credit-cards/${id}/expense-item/create`,
      EDIT: (id: string, editxpenseItemId: string) => `/credit-cards/${id}/expense-item/${editxpenseItemId}/edit`,
    },
    SUMMARY: {
      BASE_PATH: (id: string) => `/credit-cards/${id}/summaries`,
      CREATE: (id: string) => `/credit-cards/${id}/summaries/create`,
      DETAIL: (id: string, summaryId: string) => `/credit-cards/${id}/summaries/${summaryId}`,
    },
  },
  SETTINGS: {
    BASE_PATH: `/settings`,
  },
  EXPENSES: {
    BASE_PATH: `/expenses`,
    CREATE: `/expenses/create`,
    EDIT: (id: string) => `/expenses/${id}/edit`,
    SUMMARY: {
      CREATE: `/expenses/summaries/create`,
      DETAIL: (summaryId: string) => `/expenses/summaries/${summaryId}`,
    },
  },
  INVOICE: {
    BASE_PATH: `/invoice`,
  },
}
