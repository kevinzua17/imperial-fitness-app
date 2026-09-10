-- Imperial Fitness v1.12.0
-- Amplía la base nutricional con alimentos cotidianos disponibles en supermercados colombianos.
-- Valores referenciales por 100 g; para productos empacados prevalece la etiqueta del fabricante.
-- Migración idempotente: actualiza coincidencias por nombre y agrega solo registros faltantes sin cambiar IDs existentes.

begin;

create temporary table imperial_v112_colombian_foods (
  name text not null,
  category text not null,
  protein_per_100g double precision not null,
  carbs_per_100g double precision not null,
  fat_per_100g double precision not null,
  cals_per_100g double precision not null,
  fiber_per_100g double precision not null,
  client_note text not null,
  trainer_note text not null
) on commit drop;

insert into imperial_v112_colombian_foods
(name, category, protein_per_100g, carbs_per_100g, fat_per_100g, cals_per_100g, fiber_per_100g, client_note, trainer_note)
values
('Muslo de pollo sin piel cocido', 'protein', 26, 0, 7, 172, 0, 'Alternativa jugosa a la pechuga. Retira la piel para controlar la grasa.', 'Útil para adherencia y variedad; ajustar la porción por su mayor grasa.'),
  ('Pollo desmechado cocido', 'protein', 29, 0, 4, 158, 0, 'Práctico para arepas, ensaladas y almuerzos rápidos.', 'Preparar sin salsas cremosas y pesar ya cocido.'),
  ('Carne de res para sudar magra cocida', 'protein', 27, 0, 9, 195, 0, 'Opción casera común. Retira la grasa visible.', 'El valor cambia según el corte; confirmar preparación y aceite.'),
  ('Hígado de res cocido', 'protein', 26, 5, 4, 165, 0, 'Muy rico en hierro y vitamina A. Una porción ocasional es suficiente.', 'No usar a diario; revisar condiciones médicas y tolerancia.'),
  ('Chuleta de cerdo magra sin hueso', 'protein', 27, 0, 8, 185, 0, 'Fácil de conseguir y preparar a la plancha.', 'Evitar apanados y controlar cortes con grasa visible.'),
  ('Atún en aceite escurrido', 'protein', 25, 0, 8, 180, 0, 'Práctico, pero más calórico que el atún en agua.', 'Escurrir bien y ajustar grasas del resto de la comida.'),
  ('Sardinas en lata escurridas', 'protein', 25, 0, 11, 208, 0, 'Aportan proteína, calcio y omega 3.', 'Vigilar sodio y preferir porciones medidas.'),
  ('Filete de merluza cocido', 'protein', 24, 0, 2, 120, 0, 'Pescado blanco ligero para almuerzo o cena.', 'Buena opción de déficit si se cocina sin fritura.'),
  ('Jamón de cerdo bajo en grasa', 'protein', 18, 3, 4, 120, 0, 'Útil para comidas rápidas, revisa el sodio.', 'Preferir versiones con mayor porcentaje de carne y menor sodio.'),
  ('Salchicha de pollo cocida', 'protein', 13, 5, 15, 210, 0, 'Producto práctico, pero procesado y alto en sodio.', 'Uso ocasional; revisar etiqueta porque cambia mucho por marca.'),
  ('Mortadela tradicional', 'protein', 12, 4, 24, 285, 0, 'Puede consumirse ocasionalmente en porción pequeña.', 'No priorizar como fuente principal de proteína.'),
  ('Fríjol cargamanto cocido', 'protein', 9, 24, 0.6, 135, 9, 'Aporta proteína vegetal, fibra y saciedad.', 'Medir porción si se acompaña con arroz, plátano o papa.'),
  ('Fríjol rojo cocido', 'protein', 8.7, 22.8, 0.5, 127, 7.4, 'Base de muchas comidas caseras colombianas.', 'Excelente fibra; controlar acompañamientos y grasa del guiso.'),
  ('Garbanzo cocido', 'protein', 8.9, 27, 2.6, 164, 7.6, 'Sirve para ensaladas, guisos o hummus.', 'Aporta proteína y carbohidrato; ajustar ambos macros.'),
  ('Tofu firme', 'protein', 14, 3, 8, 135, 2, 'Alternativa vegetal versátil.', 'Revisar etiqueta y ajustar preparación para mejorar adherencia.'),
  ('Arepa blanca delgada', 'carb', 6, 44, 2, 220, 4, 'Alimento cotidiano. Pesa la porción y evita exceso de mantequilla.', 'El tamaño varía mucho; registrar gramos reales o etiqueta.'),
  ('Arepa de maíz amarillo', 'carb', 6, 43, 3, 225, 4, 'Buena para desayuno o preentreno con proteína.', 'Controlar rellenos y grasas añadidas.'),
  ('Arepa integral', 'carb', 7, 40, 3, 215, 6, 'Más fibra que la versión tradicional.', 'Confirmar que realmente use harina integral y revisar etiqueta.'),
  ('Harina de maíz precocida', 'carb', 7, 79, 1.5, 360, 5, 'Base para preparar arepas; registra el peso seco usado.', 'No confundir gramos de harina seca con peso de arepa cocida.'),
  ('Pan tajado blanco', 'carb', 9, 49, 3.2, 265, 2.7, 'Práctico para desayunos y meriendas.', 'Usar etiqueta del producto y controlar acompañamientos.'),
  ('Pan tajado integral', 'carb', 11, 43, 4, 250, 7, 'Aporta más fibra y saciedad.', 'Elegir opciones donde el primer ingrediente sea harina integral.'),
  ('Pan blandito colombiano', 'carb', 8, 52, 7, 305, 2, 'Puede incluirse, pero suele tener azúcar y grasa añadida.', 'Porción ocasional; preferir pan simple o integral.'),
  ('Tostadas horneadas', 'carb', 10, 71, 6, 375, 4, 'Crujientes y prácticas, pero concentradas en calorías.', 'Registrar por unidades y confirmar gramos en la etiqueta.'),
  ('Galletas de soda', 'carb', 9, 70, 12, 420, 3, 'Fáciles de transportar; mide la porción.', 'No confundir alimento ligero con bajo en calorías.'),
  ('Pasta cocida', 'carb', 5.8, 31, 1.1, 158, 1.8, 'Base económica para almuerzos.', 'Pesar cocida y controlar salsa, queso y aceite.'),
  ('Cuscús cocido', 'carb', 3.8, 23, 0.2, 112, 1.4, 'Rápido de preparar y fácil de combinar.', 'Útil para variar arroz o pasta.'),
  ('Quinua cocida', 'carb', 4.4, 21, 1.9, 120, 2.8, 'Aporta fibra y algo de proteína.', 'No considerarla proteína principal; contabilizar como carbohidrato.'),
  ('Maíz dulce en lata escurrido', 'carb', 3.4, 19, 1.5, 96, 2.7, 'Práctico para ensaladas y bowls.', 'Revisar sodio y azúcares añadidos.'),
  ('Ñame cocido', 'carb', 1.5, 28, 0.2, 118, 4.1, 'Tubérculo común en la costa colombiana.', 'Buena alternativa a papa o yuca con porción controlada.'),
  ('Arracacha cocida', 'carb', 1.2, 24, 0.3, 101, 2.6, 'Sabor suave y fácil digestión.', 'Útil para sopas o purés sin crema.'),
  ('Papa pastusa cocida con cáscara', 'carb', 2, 20, 0.1, 87, 2.1, 'Económica y saciante.', 'La cáscara aumenta fibra; evitar fritura.'),
  ('Papa a la francesa congelada horneada', 'carb', 3.4, 33, 7, 205, 3, 'Puede prepararse al horno o air fryer en porción medida.', 'Revisar etiqueta; algunas versiones traen aceite añadido.'),
  ('Plátano maduro frito', 'carb', 1.5, 36, 10, 240, 2.5, 'Muy común, pero la fritura aumenta mucho las calorías.', 'No usar como equivalente directo del plátano asado.'),
  ('Patacón frito', 'carb', 2, 39, 12, 270, 3.5, 'Producto tradicional de alta densidad calórica.', 'Uso ocasional y porción pequeña.'),
  ('Granola comercial', 'carb', 10, 64, 15, 430, 7, 'Práctica, pero suele ser alta en azúcar y grasa.', 'Revisar etiqueta; medir 25 a 40 g, no servir a ojo.'),
  ('Cereal de maíz sin azúcar', 'carb', 7, 84, 1, 370, 3, 'Rápido para desayuno, pero poco saciante solo.', 'Combinar con proteína y fruta; revisar azúcar añadida.'),
  ('Cereal de chocolate', 'snack', 6, 80, 5, 390, 4, 'Producto dulce para consumo ocasional.', 'No priorizar en déficit; usar etiqueta exacta.'),
  ('Leche entera', 'dairy', 3.2, 4.8, 3.3, 61, 0, 'Útil en desayunos y batidos.', 'Ajustar grasa total del día.'),
  ('Leche semidescremada', 'dairy', 3.3, 4.8, 1.8, 47, 0, 'Equilibrio entre sabor y calorías.', 'Buena opción cotidiana si hay tolerancia.'),
  ('Leche descremada', 'dairy', 3.4, 5, 0.2, 35, 0, 'Aporta proteína y calcio con pocas grasas.', 'Útil en déficit o cuando faltan proteínas leves.'),
  ('Leche deslactosada semidescremada', 'dairy', 3.3, 4.8, 1.8, 47, 0, 'Alternativa para personas con dificultad con la lactosa.', 'La lactosa reducida no significa menos calorías.'),
  ('Yogur natural entero', 'dairy', 3.8, 5, 3.3, 65, 0, 'Buena base para fruta o avena.', 'Evitar versiones con azúcar añadida si el plan es de déficit.'),
  ('Yogur saborizado', 'dairy', 3.5, 15, 2, 95, 0, 'Práctico, pero suele incluir azúcar.', 'Revisar etiqueta y diferenciarlo del yogur natural.'),
  ('Kumis tradicional', 'dairy', 3.2, 12, 2.5, 82, 0, 'Bebida láctea común en Colombia.', 'Frecuentemente contiene azúcar; usar etiqueta exacta.'),
  ('Queso campesino', 'dairy', 18, 2, 20, 260, 0, 'Aporta proteína, pero también grasa y sodio.', 'Medir porción de 30 a 50 g según objetivo.'),
  ('Quesito fresco', 'dairy', 16, 3, 18, 235, 0, 'Común para arepas y desayunos.', 'Controlar porción y revisar sodio.'),
  ('Queso mozzarella', 'dairy', 24, 3, 22, 300, 0, 'Buena proteína, pero concentrado en grasa.', 'Usar porciones pequeñas o versión reducida en grasa.'),
  ('Queso crema', 'dairy', 6, 4, 30, 300, 0, 'Úsalo como acompañamiento medido.', 'No contar como fuente principal de proteína.'),
  ('Mantequilla', 'fat', 0.9, 0.1, 81, 717, 0, 'Muy concentrada en calorías. Una cucharadita puede ser suficiente.', 'Registrar gramos, no cucharadas aproximadas.'),
  ('Margarina', 'fat', 0.2, 0.5, 80, 720, 0, 'Producto concentrado en grasa.', 'Revisar etiqueta y preferir pequeñas cantidades.'),
  ('Aceite vegetal', 'fat', 0, 0, 100, 884, 0, 'Una cucharada suma muchas calorías. Mídelo siempre.', 'Pesar o medir con cucharita; es una fuente frecuente de error.'),
  ('Mayonesa', 'fat', 1, 1, 75, 680, 0, 'Usa porciones pequeñas o una versión ligera.', 'Alta densidad calórica; registrar por gramos.'),
  ('Mayonesa ligera', 'fat', 1, 8, 25, 270, 0, 'Menos grasa que la tradicional, pero sigue requiriendo medida.', 'La formulación cambia por marca; usar etiqueta.'),
  ('Mantequilla de maní', 'fat', 25, 20, 50, 590, 6, 'Nutritiva y saciante, pero muy calórica.', 'Medir 10 a 20 g; no servir directamente del frasco.'),
  ('Maní tostado sin sal', 'fat', 26, 16, 49, 585, 8, 'Snack nutritivo en porción pequeña.', 'Controlar 15 a 30 g por su alta densidad calórica.'),
  ('Banano común', 'fruit', 1.1, 23, 0.3, 89, 2.6, 'Práctico para preentreno o merienda.', 'Contabilizar por peso sin cáscara.'),
  ('Manzana roja con cáscara', 'fruit', 0.3, 14, 0.2, 52, 2.4, 'Fácil de transportar y saciante.', 'Buena opción cotidiana en déficit.'),
  ('Naranja', 'fruit', 0.9, 12, 0.1, 47, 2.4, 'Mejor entera que en jugo para conservar fibra.', 'Evitar convertir varias unidades en jugo sin contabilizar.'),
  ('Mango maduro', 'fruit', 0.8, 15, 0.4, 60, 1.6, 'Dulce natural; mide la porción.', 'Útil preentreno, pero fácil de exceder por tamaño.'),
  ('Maracuyá pulpa', 'fruit', 2.2, 23, 0.7, 97, 10, 'Sabor intenso para agua o yogur.', 'Evitar azúcar añadida; la pulpa es concentrada.'),
  ('Tomate chonto', 'veg', 0.9, 3.9, 0.2, 18, 1.2, 'Base de ensaladas y guisos con pocas calorías.', 'Contabilizar aceites y salsas, no solo el tomate.'),
  ('Pepino cohombro', 'veg', 0.7, 3.6, 0.1, 15, 0.5, 'Muy ligero y refrescante.', 'Ideal para aumentar volumen del plato.'),
  ('Lechuga', 'veg', 1.4, 2.9, 0.2, 15, 1.3, 'Base ligera para ensaladas.', 'Cuidar aderezos y toppings.'),
  ('Brócoli cocido', 'veg', 2.4, 7.2, 0.4, 35, 3.3, 'Aporta fibra y volumen.', 'Buena guarnición para déficit o recomposición.'),
  ('Coliflor cocida', 'veg', 1.8, 4.1, 0.5, 23, 2.3, 'Alternativa ligera para purés o arroz de coliflor.', 'Evitar salsas cremosas si se busca bajar calorías.'),
  ('Espinaca cocida', 'veg', 3, 3.8, 0.3, 23, 2.4, 'Aporta micronutrientes y poco volumen calórico.', 'Combinar con proteína; vigilar aceite de cocción.'),
  ('Habichuela cocida', 'veg', 1.9, 7, 0.3, 35, 3.2, 'Económica y común en almuerzos.', 'Buena para aumentar fibra y saciedad.'),
  ('Repollo crudo', 'veg', 1.3, 5.8, 0.1, 25, 2.5, 'Rinde mucho y sirve para ensaladas.', 'Controlar mayonesa en preparaciones tipo coleslaw.'),
  ('Agua de panela preparada', 'drink', 0, 12, 0, 48, 0, 'Bebida tradicional con azúcar. Cuenta dentro de los carbohidratos.', 'El valor depende de la cantidad de panela; evitar servir libremente.'),
  ('Gaseosa regular', 'drink', 0, 10.6, 0, 42, 0, 'Aporta azúcar sin saciedad. Mejor reservar para ocasiones.', 'No recomendar como hidratación habitual.'),
  ('Gaseosa sin azúcar', 'drink', 0, 0, 0, 1, 0, 'Alternativa ocasional sin calorías significativas.', 'No reemplaza el agua; revisar tolerancia y hábitos.'),
  ('Jugo de naranja envasado', 'drink', 0.7, 10, 0.2, 45, 0.2, 'Revisa si tiene azúcar añadida.', 'Preferir fruta entera; usar etiqueta exacta.'),
  ('Chocolate de mesa preparado con agua', 'drink', 1.2, 14, 2.5, 82, 1.2, 'Bebida tradicional; registra azúcar y cantidad de chocolate.', 'Puede variar mucho; usar receta real o etiqueta.'),
  ('Palomitas de maíz caseras sin mantequilla', 'snack', 12, 65, 5, 370, 14, 'Snack con buen volumen cuando se mide el aceite.', 'Registrar maíz seco y aceite por separado.'),
  ('Papas fritas de paquete', 'snack', 6, 52, 34, 540, 4, 'Producto ocasional, alto en grasa y sodio.', 'No usar como carbohidrato habitual.'),
  ('Chocorramo o ponqué cubierto', 'snack', 5, 58, 25, 475, 2, 'Postre común de alta densidad calórica.', 'Registrar por unidad y reservar para planificación flexible.'),
  ('Galletas dulces rellenas', 'snack', 5, 69, 20, 475, 3, 'Fáciles de exceder; sirve una porción definida.', 'Usar etiqueta específica por marca.'),
  ('Gelatina sin azúcar preparada', 'snack', 2, 1, 0, 12, 0, 'Postre ligero para controlar antojos.', 'No aporta proteína relevante aunque contenga gelatina.'),
  ('Barra de cereal comercial', 'snack', 6, 70, 10, 390, 5, 'Práctica, pero puede contener bastante azúcar.', 'Revisar etiqueta y no asumir que es alta en proteína.');

update public.foods as target
set
  category = source.category,
  protein_per_100g = source.protein_per_100g,
  carbs_per_100g = source.carbs_per_100g,
  fat_per_100g = source.fat_per_100g,
  cals_per_100g = source.cals_per_100g,
  fiber_per_100g = source.fiber_per_100g,
  client_note = source.client_note,
  trainer_note = source.trainer_note
from imperial_v112_colombian_foods as source
where lower(target.name) = lower(source.name);

insert into public.foods
(name, category, protein_per_100g, carbs_per_100g, fat_per_100g, cals_per_100g, fiber_per_100g, client_note, trainer_note)
select
  source.name,
  source.category,
  source.protein_per_100g,
  source.carbs_per_100g,
  source.fat_per_100g,
  source.cals_per_100g,
  source.fiber_per_100g,
  source.client_note,
  source.trainer_note
from imperial_v112_colombian_foods as source
where not exists (
  select 1
  from public.foods as target
  where lower(target.name) = lower(source.name)
);

create index if not exists idx_foods_name_lower on public.foods (lower(name));

commit;
