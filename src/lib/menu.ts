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

const find = (name: string) => MENU.find((f) => f.name === name);

/** Precio de una pizza de 1 sabor, o de 2 mitades: se cobra la mitad más cara. */
export function priceOf(flavors: string[]): number | null {
  const found = flavors.map(find);
  if (found.some((f) => !f)) return null;
  return Math.max(...found.map((f) => f!.price));
}

export const itemName = (flavors: string[]) =>
  flavors.length === 2
    ? `Pizza 1/2 ${flavors[0]} + 1/2 ${flavors[1]}`
    : `Pizza ${flavors[0]}`;
