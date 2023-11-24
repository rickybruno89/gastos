export const BASE_PATH = "/dashboard";

export const PAGES_URL = {
  CREDIT_CARDS: {
    BASE_PATH: `${BASE_PATH}/credit-cards`,
    CREATE: `${BASE_PATH}/credit-cards/create`,
    DETAILS: (id: string) => `${BASE_PATH}/credit-cards/${id}`,
    EXPENSE_ITEM: {
      CREATE: (id: string) =>
        `${BASE_PATH}/credit-cards/${id}/expense-item/create`,
    },
    SUMMARY: {
      BASE_PATH: (id: string) => `${BASE_PATH}/credit-cards/${id}/summary`,
      CREATE: (id: string) => `${BASE_PATH}/credit-cards/${id}/summary/create`,
    },
  },
  SETTINGS: {
    BASE_PATH: `${BASE_PATH}/settings`,
    PAYMENT_TYPE_CREATE: `${BASE_PATH}/settings/payment-type/create`,
    PAYMENT_SOURCE_CREATE: `${BASE_PATH}/settings/payment-source/create`,
    PERSON_TO_SHARE_EXPENSE: `${BASE_PATH}/settings/person-to-share-expense/create`,
    CURRENCY_CREATE: `${BASE_PATH}/settings/currency/create`,
  },
  EXPENSES: {
    BASE_PATH: `${BASE_PATH}/expenses`,
    CREATE: `${BASE_PATH}/expenses/create`,
  },
};
