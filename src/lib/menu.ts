// ============================================================================
// MENÚ DE SABORES
// ----------------------------------------------------------------------------
// Única fuente de verdad de qué sabores existen y cuánto cuesta cada uno.
// Tanto el formulario (para mostrar las opciones) como el servidor (para
// calcular el precio real de cada pedido, sin confiar en lo que mande el
// navegador) importan estos datos desde acá.
// ============================================================================

export interface Flavor {
  name: string;
  price: number; // Gs
}

export const MENU: Flavor[] = [
  { name: "Mozzarella", price: 30000 },
  { name: "Pollo Catupiry", price: 40000 },
  { name: "Peperoni", price: 40000 },
  { name: "Caprese", price: 40000 },
  { name: "Choclo", price: 40000 },
  { name: "Napolitana", price: 40000 },
];

/** Valor inicial sugerido del campo delivery (editable en el formulario). */
export const DEFAULT_DELIVERY_FEE = 10000;

// `.find()` devuelve el primer elemento que cumple la condición, o
// `undefined` si ninguno coincide. Por eso `priceOf` de abajo puede devolver
// `null` cuando algún sabor no existe en el menú.
const find = (name: string) => MENU.find((f) => f.name === name);

/** Precio de una pizza de 1 sabor, o de 2 mitades: se cobra la mitad más cara. */
export function priceOf(flavors: string[]): number | null {
  const found = flavors.map(find); // convierte ["Choclo", "Mozzarella"] en [Flavor, Flavor]
  if (found.some((f) => !f)) return null; // si algún sabor no existe, todo el pedido es inválido
  // `f!` = "sé que f no es null/undefined en este punto" (ya lo chequeamos arriba).
  // Math.max(...array) necesita los números "desplegados" con el operador spread (...).
  return Math.max(...found.map((f) => f!.price));
}


export interface Promo {
  name: string;
  price: number; // Gs, precio del paquete completo (no es la suma de las partes)
}

// Promociones vigentes: combos a un precio fijo, distinto de sumar sabores
// sueltos. Cada una se pide como su propia línea en el formulario (no se
// mezcla con "mitad y mitad"): la cantidad es cuántos paquetes, no pizzas.
export const PROMOS: Promo[] = [
  { name: "Promo 2 pizzas Mozzarella", price: 50000 },
];

/** Precio de una promo por su nombre, o null si no existe (igual criterio que priceOf). */
export const promoPrice = (name: string): number | null =>
  PROMOS.find((p) => p.name === name)?.price ?? null;

export const itemName = (flavors: string[]) =>
  flavors.length === 2
    ? `Pizza 1/2 ${flavors[0]} + 1/2 ${flavors[1]}`
    : `Pizza ${flavors[0]}`;
