export interface MenuItem {
  name: string;
  price: number; // Gs
}

// Precios de ejemplo salvo Pizza Choclo (dato del ticket). Ajustar al menú real.
export const MENU: MenuItem[] = [
  { name: "Pizza Choclo", price: 40000 },
  { name: "Pizza Muzzarella", price: 35000 },
  { name: "Pizza Calabresa", price: 45000 },
];

/** Valor inicial sugerido del campo delivery (editable en el formulario). */
export const DEFAULT_DELIVERY_FEE = 10000;
