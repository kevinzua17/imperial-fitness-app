import type { FoodItem } from './foodDatabase';

export type FoodImageOverrides = Record<string, string>;

export interface FoodMediaResult {
  key: string;
  imageUrl: string;
  label: string;
  source: 'admin' | 'imperial';
  isCustom: boolean;
}

export function normalizeFoodKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'alimento';
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function classifyFoodImage(name: string, category?: FoodItem['category'] | string): { slug: string; label: string } {
  const text = normalizeText(name);
  if (/pollo|pavo|gallina/.test(text)) return { slug: 'pollo', label: 'Proteína magra' };
  if (/res|bistec|carne|sobrebarriga|muchacho|molida/.test(text)) return { slug: 'res', label: 'Carne de res' };
  if (/cerdo|pernil|chuleta/.test(text)) return { slug: 'cerdo', label: 'Carne de cerdo' };
  if (/pescado|tilapia|trucha|mojarra|bocachico|atun|sardina|salmon|corvina|robalo|merluza|camaron/.test(text)) return { slug: 'pescado', label: 'Pescado / mariscos' };
  if (/huevo|clara/.test(text)) return { slug: 'huevo', label: 'Huevos' };
  if (/arroz/.test(text)) return { slug: 'arroz', label: 'Arroz' };
  if (/pasta|espagueti|macarron|lasagna/.test(text)) return { slug: 'pasta', label: 'Pasta' };
  if (/arepa/.test(text)) return { slug: 'arepa', label: 'Arepa' };
  if (/papa|yuca|camote|batata|arracacha/.test(text)) return { slug: 'papa-yuca', label: 'Tubérculo' };
  if (/platano|patacon|toston/.test(text)) return { slug: 'platano', label: 'Plátano' };
  if (/frijol|frijoles|cargamanto/.test(text)) return { slug: 'frijoles', label: 'Fríjoles' };
  if (/lenteja|garbanzo|arveja/.test(text)) return { slug: 'lentejas', label: 'Legumbre' };
  if (/queso|mozzarella|cuajada|costeno|doble crema/.test(text)) return { slug: 'queso', label: 'Queso' };
  if (/yogur|kumis|leche/.test(text)) return { slug: 'yogur', label: 'Lácteo' };
  if (/aguacate/.test(text)) return { slug: 'aguacate', label: 'Grasa saludable' };
  if (/aceite|mantequilla|mani|almendra|nuez|chia|linaza/.test(text)) return { slug: 'aceite', label: 'Grasa / semilla' };
  if (/brocoli|espinaca|lechuga|repollo|acelga|pepino|tomate|pimenton|zanahoria|coliflor|habichuela|apio|ahuyama|berenjena|remolacha|guatila|cilantro|cebolla|verdura|ensalada/.test(text)) return { slug: 'verduras', label: 'Verduras' };
  if (/banano|manzana|fresa|mandarina|papaya|pina|sandia|mango|uva|arandano|guanabana|maracuya|guayaba|mora|lulo|granadilla|fruta/.test(text)) return { slug: 'frutas', label: 'Fruta' };
  if (/agua|cafe|te|limonada|jugo|coco|bebida/.test(text)) return { slug: 'bebidas', label: 'Bebida' };
  if (/ajiaco|sancocho|bandeja|sudado|mondongo|calentado|cazuela/.test(text)) return { slug: 'plato-colombiano', label: 'Plato colombiano' };
  if (category === 'protein') return { slug: 'pollo', label: 'Proteína' };
  if (category === 'carb') return { slug: 'arroz', label: 'Carbohidrato' };
  if (category === 'fruit') return { slug: 'frutas', label: 'Fruta' };
  if (category === 'veg') return { slug: 'verduras', label: 'Verdura' };
  if (category === 'dairy') return { slug: 'queso', label: 'Lácteo' };
  if (category === 'drink') return { slug: 'bebidas', label: 'Bebida' };
  if (category === 'fat') return { slug: 'aguacate', label: 'Grasa saludable' };
  if (category === 'snack') return { slug: 'snack', label: 'Snack / plato' };
  return { slug: 'default', label: 'Alimento' };
}

export function getFoodMedia(name: string, category?: FoodItem['category'] | string, overrides: FoodImageOverrides = {}): FoodMediaResult {
  const key = normalizeFoodKey(name);
  const custom = overrides[key];
  if (custom) {
    return { key, imageUrl: custom, label: 'Imagen personalizada', source: 'admin', isCustom: true };
  }
  const classified = classifyFoodImage(name, category);
  return {
    key,
    imageUrl: `/foods/${classified.slug}.svg`,
    label: classified.label,
    source: 'imperial',
    isCustom: false,
  };
}
