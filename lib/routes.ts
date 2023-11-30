export const PAGES_URL = {
  DASHBOARD: {
    BASE_PATH: `/dashboard`,
  },
  CREDIT_CARDS: {
    BASE_PATH: `/credit-cards`,
    CREATE: `/credit-cards/create`,
    DETAILS: (id: string) => `/credit-cards/${id}`,
    EXPENSE_ITEM: {
      CREATE: (id: string) => `/credit-cards/${id}/expense-item/create`,
      EDIT: (id: string, editxpenseItemId: string) => `/credit-cards/${id}/expense-item/edit/${editxpenseItemId}`,
    },
    SUMMARY: {
      BASE_PATH: (id: string) => `/credit-cards/${id}/summaries`,
      CREATE: (id: string) => `/credit-cards/${id}/summaries/create`,
      DETAIL: (id: string, summaryId: string) => `/credit-cards/${id}/summaries/${summaryId}`,
    },
  },
  SETTINGS: {
    BASE_PATH: `/settings`,
    PAYMENT_TYPE_CREATE: `/settings/payment-type/create`,
    PAYMENT_SOURCE_CREATE: `/settings/payment-source/create`,
    PERSON_TO_SHARE_EXPENSE: `/settings/person-to-share-expense/create`,
    CURRENCY_CREATE: `/settings/currency/create`,
  },
  EXPENSES: {
    BASE_PATH: `/expenses`,
    CREATE: `/expenses/create`,
    SUMMARY: {
      CREATE: `/expenses/summaries/create`,
      DETAIL: (summaryId: string) => `/expenses/summaries/${summaryId}`,
    },
  },
}
