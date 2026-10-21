import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { amountRaw } from "../lib/format";

// Importe con máscara es-AR ($ 1.234,56). El valor enviado en el formulario es
// el número crudo ("1234.56"), así el parseo no depende de la máscara.
export function MoneyInput({
  id,
  name = "amount",
  currency = "ARS",
  defaultMinor,
  allowNegative = false,
  required = true,
  placeholder = "0,00",
}: {
  id: string;
  name?: string;
  currency?: "ARS" | "USD";
  defaultMinor?: string;
  allowNegative?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState(defaultMinor ? amountRaw(defaultMinor) : "");
  return (
    <>
      <NumericFormat
        id={id}
        value={raw}
        valueIsNumericString
        onValueChange={(values) => setRaw(values.value)}
        prefix={currency === "USD" ? "US$ " : "$ "}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        allowNegative={allowNegative}
        inputMode="decimal"
        placeholder={placeholder}
        required={required}
        maxLength={24}
        autoComplete="off"
      />
      <input type="hidden" name={name} value={raw} />
    </>
  );
}
