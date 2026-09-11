// ============================================================
// BASE DE DATOS NUTRICIONAL COMPLETA - IMPERIAL FITNESS
// Más de 130 alimentos con valores por cada 100g,
// notas para el cliente, notas para el entrenador,
// y advertencias según el objetivo del usuario.
// ============================================================

export interface FoodItem {
  id?: number;
  name: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  calsPer100g: number;
  fiberPer100g: number;
  category: 'protein' | 'carb' | 'fat' | 'veg' | 'drink' | 'fruit' | 'dairy' | 'snack';
  clientNote: string;
  trainerNote: string;
  avoidIfGoalIncludes?: string[];
  preferIfGoalIncludes?: string[];
}

export const FOOD_DATABASE: FoodItem[] = [
  // ===================== PROTEÍNAS ANIMALES =====================
  { name: 'Pechuga de pollo a la plancha', proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, calsPer100g: 165, fiberPer100g: 0, category: 'protein', clientNote: 'Base principal de cualquier plan. Magra, versátil y económica.', trainerNote: 'Primera opción en déficit y recomposición. Fácil de pesar y ajustar.', preferIfGoalIncludes: ['grasa', 'definición', 'fuerza'] },
  { name: 'Lomo de res magro', proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 180, fiberPer100g: 0, category: 'protein', clientNote: 'Aporta hierro y creatina natural. Ideal para días pesados.', trainerNote: 'Controlar frecuencia si hay retención o digestión lenta. Muy útil en volumen.' },
  { name: 'Lomo de cerdo magro', proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 5, calsPer100g: 155, fiberPer100g: 0, category: 'protein', clientNote: 'Más magro de lo que crees. Buena alternativa al pollo.', trainerNote: 'Verificar que el corte sea realmente magro sin cuero ni grasa visible.' },
  { name: 'Pavo molido magro (93%)', proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 7, calsPer100g: 163, fiberPer100g: 0, category: 'protein', clientNote: 'Varía el sabor sin elevar demasiado las calorías.', trainerNote: 'Buen reemplazo del pollo para evitar monotonía en la dieta.' },
  { name: 'Tilapia al vapor', proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 2.3, calsPer100g: 128, fiberPer100g: 0, category: 'protein', clientNote: 'Muy ligera para cenas. Combina bien con ensalada.', trainerNote: 'Excelente cena para déficit, baja carga digestiva y fácil preparación.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Corvina / Róbalo al horno', proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 1.5, calsPer100g: 110, fiberPer100g: 0, category: 'protein', clientNote: 'Pescado blanco ultramagro. Prácticamente toda su caloría es proteína.', trainerNote: 'De los pescados más magros disponibles. Priorizar en definición.' },
  { name: 'Salmón rosado', proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, calsPer100g: 208, fiberPer100g: 0, category: 'protein', clientNote: 'Nutritivo pero más alto en grasa. Controla la porción si buscas definirte.', trainerNote: 'Útil para salud hormonal y articular. Ajustar grasas del resto del día cuando se consume.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Trucha arcoíris', proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 6, calsPer100g: 148, fiberPer100g: 0, category: 'protein', clientNote: 'Buen intermedio entre pescado magro y salmón. Fácil de conseguir en Colombia.', trainerNote: 'Alternativa colombiana al salmón con menos grasa. Buena relación precio/calidad.' },
  { name: 'Atún en agua (lata escurrida)', proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1, calsPer100g: 116, fiberPer100g: 0, category: 'protein', clientNote: 'Práctico y rápido. Revisa sodio si retienes líquidos.', trainerNote: 'Útil en planes con poco tiempo. No abusar por mercurio y sodio (máx 3 latas/semana).' },
  { name: 'Camarones cocidos', proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 1.7, calsPer100g: 100, fiberPer100g: 0, category: 'protein', clientNote: 'Muy magros y sabrosos. Buenos para variar del pollo.', trainerNote: 'Excelente perfil proteico. Verificar alergias y sodio en presentaciones precocidas.' },
  { name: 'Huevos enteros cocidos', proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, calsPer100g: 155, fiberPer100g: 0, category: 'protein', clientNote: 'Buenos para desayuno. Si estás en corte, combina con claras.', trainerNote: 'Mezclar con claras para mantener proteína y bajar grasa total. Máx 2-3 enteros en déficit.' },
  { name: 'Claras de huevo', proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, calsPer100g: 52, fiberPer100g: 0, category: 'protein', clientNote: 'Proteína casi pura. Muy fáciles de ajustar en cantidad.', trainerNote: 'Herramienta clave para subir proteína sin subir calorías. Enseñar al cliente a prepararlas con sabor.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Pechuga de pavo rebanada', proteinPer100g: 18, carbsPer100g: 3, fatPer100g: 1, calsPer100g: 95, fiberPer100g: 0, category: 'protein', clientNote: 'Snack proteico rápido. Cuidado con el sodio de las versiones procesadas.', trainerNote: 'Solo usar versiones bajas en sodio. Revisar etiqueta nutricional con el cliente.' },
  { name: 'Carne molida 90/10', proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 10, calsPer100g: 176, fiberPer100g: 0, category: 'protein', clientNote: 'Versátil para hamburguesas fit o boloñesa. Escurrir bien la grasa al cocinar.', trainerNote: 'Verificar el porcentaje real de grasa. Escurrir después de cocinar reduce ~3g de grasa por porción.' },

  // ===================== CARBOHIDRATOS =====================
  { name: 'Arroz blanco cocido', proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, calsPer100g: 130, fiberPer100g: 0.4, category: 'carb', clientNote: 'El más común en Colombia. Mide siempre con taza o báscula.', trainerNote: 'Fácil de comer en exceso. Enseñar al cliente a pesar la porción cocida, no cruda.' },
  { name: 'Arroz integral cocido', proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9, calsPer100g: 112, fiberPer100g: 1.8, category: 'carb', clientNote: 'Más fibra y saciedad que el blanco. Bueno para almuerzos.', trainerNote: 'Controlar porción si el cliente tiene baja actividad. La fibra extra ayuda en adherencia.' },
  { name: 'Papa cocida (sin cáscara)', proteinPer100g: 1.7, carbsPer100g: 17, fatPer100g: 0.1, calsPer100g: 77, fiberPer100g: 1.3, category: 'carb', clientNote: 'De las más saciantes por su volumen y bajo en calorías. Ideal para reemplazar plátano.', trainerNote: 'Excelente en déficit por índice de saciedad alto. Evitar freír o añadir salsas.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Papa criolla cocida', proteinPer100g: 2, carbsPer100g: 14, fatPer100g: 0.1, calsPer100g: 66, fiberPer100g: 1.5, category: 'carb', clientNote: 'Más ligera que la papa normal. Muy colombiana y fácil de preparar.', trainerNote: 'Buena variante regional. Porciones generosas posibles en déficit.' },
  { name: 'Plátano maduro asado', proteinPer100g: 1.3, carbsPer100g: 32, fatPer100g: 0.4, calsPer100g: 122, fiberPer100g: 2.3, category: 'carb', clientNote: 'Energía rápida. Úsalo medido porque sube rápido los carbohidratos.', trainerNote: 'Bueno pre-entreno. Evitar grandes porciones en pérdida de grasa nocturna.', avoidIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Plátano verde cocido', proteinPer100g: 1, carbsPer100g: 31, fatPer100g: 0.2, calsPer100g: 116, fiberPer100g: 3, category: 'carb', clientNote: 'Almidón resistente que alimenta tu flora intestinal. Sacia bastante.', trainerNote: 'El almidón resistente del verde cocido tiene efecto prebiótico. Buena opción post-entreno.' },
  { name: 'Yuca cocida', proteinPer100g: 1.4, carbsPer100g: 38, fatPer100g: 0.3, calsPer100g: 160, fiberPer100g: 1.8, category: 'carb', clientNote: 'Muy energética. Mejor antes o después de entrenar.', trainerNote: 'Alta densidad de carbohidratos. No priorizar en definición si el cliente no entrena fuerte.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Camote / Batata asada', proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, calsPer100g: 90, fiberPer100g: 3, category: 'carb', clientNote: 'Sacia bien, dulce natural y combina con proteína magra.', trainerNote: 'Muy buena alternativa para recomposición corporal. Fibra alta para saciedad.' },
  { name: 'Avena en hojuelas (seca)', proteinPer100g: 13, carbsPer100g: 66, fatPer100g: 7, calsPer100g: 389, fiberPer100g: 10, category: 'carb', clientNote: 'Muy concentrada. 40g secos son suficientes para un desayuno completo.', trainerNote: 'Siempre medir en seco con báscula. El cliente suele subestimar la porción.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Quinoa cocida', proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, calsPer100g: 120, fiberPer100g: 2.8, category: 'carb', clientNote: 'Aporta proteína vegetal. Buena textura y sabor suave.', trainerNote: 'Buena opción para clientes que se cansan del arroz. Tiene aminoácidos esenciales.' },
  { name: 'Arepa de maíz blanco (sin relleno)', proteinPer100g: 4, carbsPer100g: 45, fatPer100g: 3.5, calsPer100g: 210, fiberPer100g: 1.5, category: 'carb', clientNote: 'Puedes consumirla, pero la porción debe ser controlada. Sin mantequilla ni queso extra.', trainerNote: 'Alta densidad calórica. Vigilar rellenos, salsas y mantequilla. Una arepa pequeña ya son ~130kcal.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Pasta cocida (al dente)', proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, calsPer100g: 131, fiberPer100g: 1.8, category: 'carb', clientNote: 'Útil cuando necesitas energía para entrenamientos largos. Mide la porción cocida.', trainerNote: 'No sugerir en la noche si hay poca actividad. Al dente tiene menor índice glucémico.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Pan integral (rebanada 30g)', proteinPer100g: 13, carbsPer100g: 43, fatPer100g: 3.4, calsPer100g: 247, fiberPer100g: 7, category: 'carb', clientNote: 'Una rebanada es ~75kcal. No exceder 2 rebanadas al día en corte.', trainerNote: 'Verificar que sea integral de verdad (primer ingrediente: harina integral). Muchos son blancos disfrazados.' },
  { name: 'Fríjol rojo / cargamanto cocido', proteinPer100g: 8.7, carbsPer100g: 22, fatPer100g: 0.5, calsPer100g: 127, fiberPer100g: 7.4, category: 'carb', clientNote: 'Aporta fibra y saciedad. Puede caer pesado si entrenas inmediatamente.', trainerNote: 'Buena en almuerzo, no en pre-entreno cercano. Alta fibra mejora adherencia en déficit.' },
  { name: 'Lentejas cocidas', proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, calsPer100g: 116, fiberPer100g: 7.9, category: 'carb', clientNote: 'Sacia bastante. Fuente vegetal de hierro.', trainerNote: 'Recomendable en déficit por fibra. Observar tolerancia digestiva individual.' },
  { name: 'Garbanzos cocidos', proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6, calsPer100g: 164, fiberPer100g: 7.6, category: 'carb', clientNote: 'Versátiles. Funcionan en ensaladas, sopas o hummus medido.', trainerNote: 'Calóricos para una legumbre. Controlar porción. Hummus solo medido con cuchara.' },
  { name: 'Maíz desgranado cocido', proteinPer100g: 3.3, carbsPer100g: 19, fatPer100g: 1.5, calsPer100g: 96, fiberPer100g: 2.7, category: 'carb', clientNote: 'Acompaña bien las ensaladas. No exceder un puñado.', trainerNote: 'Cuidado en déficit: los clientes tienden a echar demasiado en ensaladas sin pesarlo.' },
  { name: 'Tortilla de maíz (unidad ~30g)', proteinPer100g: 6, carbsPer100g: 44, fatPer100g: 2, calsPer100g: 218, fiberPer100g: 5, category: 'carb', clientNote: 'Una unidad tiene ~65kcal. Buena para wraps saludables.', trainerNote: 'Alternativa útil al pan. Verificar que sea de maíz real y no de harina refinada.' },

  // ===================== FRUTAS =====================
  { name: 'Banano', proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, calsPer100g: 89, fiberPer100g: 2.6, category: 'fruit', clientNote: 'Práctico antes de entrenar. Evítalo si ya cubriste carbohidratos del día.', trainerNote: 'Bueno para adherencia y calambres. Controlar si busca definición.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Manzana roja (con cáscara)', proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, calsPer100g: 52, fiberPer100g: 2.4, category: 'fruit', clientNote: 'Ligera y saciante para antojos dulces. Come la cáscara para más fibra.', trainerNote: 'Útil para snacks en déficit. Combina bien con yogur griego.' },
  { name: 'Fresas', proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, calsPer100g: 32, fiberPer100g: 2, category: 'fruit', clientNote: 'Muy buena opción dulce con pocas calorías. Libre en buena cantidad.', trainerNote: 'Excelente para clientes con ansiedad por dulce en definición. Alta en vitamina C.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Mandarina', proteinPer100g: 0.8, carbsPer100g: 12, fatPer100g: 0.3, calsPer100g: 53, fiberPer100g: 1.8, category: 'fruit', clientNote: 'Snack portátil y refrescante. Dos unidades medianas son ~100kcal.', trainerNote: 'Buena opción de fruta media mañana. Bajo impacto calórico.' },
  { name: 'Papaya', proteinPer100g: 0.5, carbsPer100g: 11, fatPer100g: 0.3, calsPer100g: 43, fiberPer100g: 1.7, category: 'fruit', clientNote: 'Excelente para digestión. Libre en porciones moderadas.', trainerNote: 'Papaína ayuda digestión de proteína. Buena opción post-almuerzo.' },
  { name: 'Piña', proteinPer100g: 0.5, carbsPer100g: 13, fatPer100g: 0.1, calsPer100g: 50, fiberPer100g: 1.4, category: 'fruit', clientNote: 'Dulce natural. Consume con moderación si estás en corte.', trainerNote: 'Contiene bromelina antiinflamatoria. Útil post-entreno pero vigilar cantidad.' },
  { name: 'Sandía', proteinPer100g: 0.6, carbsPer100g: 8, fatPer100g: 0.2, calsPer100g: 30, fiberPer100g: 0.4, category: 'fruit', clientNote: 'Muy baja en calorías y refrescante. Ideal para después de entrenar.', trainerNote: 'Excelente para rehidratación natural. Libre en prácticamente cualquier plan.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Mango', proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, calsPer100g: 60, fiberPer100g: 1.6, category: 'fruit', clientNote: 'Delicioso pero calórico para ser fruta. Una taza es suficiente.', trainerNote: 'Controlar porción en definición. Alto en azúcar natural.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Uvas', proteinPer100g: 0.7, carbsPer100g: 18, fatPer100g: 0.2, calsPer100g: 69, fiberPer100g: 0.9, category: 'fruit', clientNote: 'Fáciles de comer sin medida. Pesa la porción siempre.', trainerNote: 'Alta densidad de azúcar. El cliente suele comer 200-300g sin darse cuenta.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Arándanos', proteinPer100g: 0.7, carbsPer100g: 14, fatPer100g: 0.3, calsPer100g: 57, fiberPer100g: 2.4, category: 'fruit', clientNote: 'Antioxidantes potentes. Buenos con avena o yogur.', trainerNote: 'Excelente complemento. Porciones de 60-80g son suficientes.' },
  { name: 'Guanábana / Pulpa', proteinPer100g: 1, carbsPer100g: 17, fatPer100g: 0.3, calsPer100g: 66, fiberPer100g: 3.3, category: 'fruit', clientNote: 'Rica en fibra. Usarla para jugo sin azúcar.', trainerNote: 'Cuidado con jugos añadidos con azúcar. Preferir la fruta entera o pulpa sin endulzar.' },
  { name: 'Maracuyá / Pulpa', proteinPer100g: 2.2, carbsPer100g: 11, fatPer100g: 0.7, calsPer100g: 97, fiberPer100g: 10, category: 'fruit', clientNote: 'Ácido y refrescante. Muy alta en fibra.', trainerNote: 'Buena fruta para jugos naturales. Recordar no añadir azúcar.' },

  // ===================== GRASAS SALUDABLES =====================
  { name: 'Aguacate Hass', proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 15, calsPer100g: 160, fiberPer100g: 6.7, category: 'fat', clientNote: 'Grasa saludable, pero muy calórica. 50g (1/4 de unidad) ya son 80kcal.', trainerNote: 'Útil en saciedad. Reducir a 30-50g si la meta es grasa corporal baja.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Aceite de oliva extra virgen', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, calsPer100g: 884, fiberPer100g: 0, category: 'fat', clientNote: 'Saludable, pero 1 cucharada (15ml) son 120kcal. Nunca verter directo de la botella.', trainerNote: 'Medir en cucharadita o báscula. Principal causa de excedentes calóricos invisibles.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Aceite de coco', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, calsPer100g: 862, fiberPer100g: 0, category: 'fat', clientNote: 'Igual de calórico que cualquier aceite. No es mágico para quemar grasa.', trainerNote: 'Desmentir mitos. Mismo trato que cualquier aceite: medir estrictamente.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Almendras', proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 49, calsPer100g: 579, fiberPer100g: 12, category: 'fat', clientNote: 'Buen snack, pero un puñado descuidado puede sumar 300kcal.', trainerNote: 'Porciones de 15-20g máximo en definición. Fácil excederse por palatabilidad.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Nueces de nogal', proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65, calsPer100g: 654, fiberPer100g: 7, category: 'fat', clientNote: 'Omega 3 vegetal. 5-6 mitades son suficientes (~15g).', trainerNote: 'Muy densas. Nunca dejar libre acceso. Solo medido.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Mantequilla de maní natural', proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, calsPer100g: 588, fiberPer100g: 6, category: 'fat', clientNote: 'Muy densa en calorías. Una cucharada rasa son ~90kcal. Solo medida.', trainerNote: 'Evitar en clientes con ansiedad por dulce o baja adherencia. Muy adictiva.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Semillas de chía', proteinPer100g: 17, carbsPer100g: 42, fatPer100g: 31, calsPer100g: 486, fiberPer100g: 34, category: 'fat', clientNote: 'Altísima en fibra. 10g en agua o yogur son suficientes.', trainerNote: 'Buena para tránsito intestinal. La fibra absorbe mucha agua, ayuda en saciedad.' },
  { name: 'Semillas de linaza molida', proteinPer100g: 18, carbsPer100g: 29, fatPer100g: 42, calsPer100g: 534, fiberPer100g: 27, category: 'fat', clientNote: 'Fuente vegetal de omega 3. Usar molida para absorberla.', trainerNote: 'Solo funciona molida. 10g al día como máximo en smoothies o avena.' },
  { name: 'Maní sin sal (tostado)', proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, calsPer100g: 567, fiberPer100g: 8.5, category: 'fat', clientNote: 'Económico y proteico, pero muy calórico. Máximo un puñadito.', trainerNote: 'Vigilar ingesta libre. Solo medido. Alternativa proteica económica en volumen.' },

  // ===================== LÁCTEOS Y DERIVADOS =====================
  { name: 'Yogur griego natural sin azúcar', proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.7, calsPer100g: 59, fiberPer100g: 0, category: 'dairy', clientNote: 'Alto en proteína y bajo en calorías. Ideal con fruta cuando quieres algo dulce.', trainerNote: 'Gran alternativa a postres. Verificar que sea sin azúcar y bajo en grasa.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Queso cottage bajo en grasa', proteinPer100g: 11, carbsPer100g: 3.4, fatPer100g: 4.3, calsPer100g: 98, fiberPer100g: 0, category: 'dairy', clientNote: 'Bueno como snack nocturno por su caseína (proteína lenta). Si toleras lácteos.', trainerNote: 'Vigilar tolerancia digestiva y sodio. Caseína lo hace ideal antes de dormir.' },
  { name: 'Queso campesino fresco', proteinPer100g: 18, carbsPer100g: 2, fatPer100g: 12, calsPer100g: 190, fiberPer100g: 0, category: 'dairy', clientNote: 'Proteico pero calórico. Una tajada delgada está bien, no tres.', trainerNote: 'Muy común en Colombia. Enseñar al cliente a cortar porciones de 30g máximo en déficit.' },
  { name: 'Leche deslactosada descremada', proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 0.1, calsPer100g: 34, fiberPer100g: 0, category: 'dairy', clientNote: 'Baja en calorías. Buena para batidos o café.', trainerNote: 'Opción segura para batidos post-entreno. Verificar tolerancia lactosa.' },
  { name: 'Proteína de suero (Whey) polvo', proteinPer100g: 80, carbsPer100g: 7, fatPer100g: 3, calsPer100g: 376, fiberPer100g: 0, category: 'dairy', clientNote: 'Un scoop (~30g) aporta ~24g de proteína. Herramienta, no reemplazo de comida real.', trainerNote: 'Usar solo para completar requerimiento proteico si no se alcanza con comida. No es obligatorio.' },

  // ===================== VEGETALES =====================
  { name: 'Brócoli al vapor', proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, calsPer100g: 35, fiberPer100g: 2.6, category: 'veg', clientNote: 'Aumenta volumen del plato con pocas calorías. Come todo el que quieras.', trainerNote: 'Excelente para saciedad y digestión. Libre en cualquier plan.' },
  { name: 'Espinaca cruda', proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, calsPer100g: 23, fiberPer100g: 2.2, category: 'veg', clientNote: 'Rica en hierro vegetal. Libre en ensaladas sin salsas calóricas.', trainerNote: 'Usar para aumentar adherencia y volumen visual en déficit.' },
  { name: 'Zucchini / Calabacín salteado', proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3, calsPer100g: 17, fiberPer100g: 1, category: 'veg', clientNote: 'Ligero y fácil de combinar con cualquier proteína.', trainerNote: 'Muy útil para volumen visual del plato. Se puede usar como reemplazo de pasta.' },
  { name: 'Champiñones salteados', proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3, calsPer100g: 22, fiberPer100g: 1, category: 'veg', clientNote: 'Dan sabor y volumen sin calorías. Buenos con huevos en el desayuno.', trainerNote: 'Recomendables en cenas y desayunos. Ayudan a que el plato se sienta completo.' },
  { name: 'Tomate fresco', proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, calsPer100g: 18, fiberPer100g: 1.2, category: 'veg', clientNote: 'Libre. Úsalo en ensaladas, salsas y aderezos caseros.', trainerNote: 'Libre en cualquier plan. Rico en licopeno antioxidante.' },
  { name: 'Cebolla cabezona', proteinPer100g: 1.1, carbsPer100g: 9, fatPer100g: 0.1, calsPer100g: 40, fiberPer100g: 1.7, category: 'veg', clientNote: 'Aporta sabor a cualquier preparación. Libre para cocinar.', trainerNote: 'Libre como condimento en preparaciones.' },
  { name: 'Pimentón rojo', proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3, calsPer100g: 31, fiberPer100g: 2.1, category: 'veg', clientNote: 'Dulce y crujiente. Excelente para snacks con hummus medido.', trainerNote: 'Rico en vitamina C. Libre en ensaladas y salteados.' },
  { name: 'Zanahoria cruda', proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, calsPer100g: 41, fiberPer100g: 2.8, category: 'veg', clientNote: 'Snack natural crujiente. Sacia más de lo que crees.', trainerNote: 'Buena para adherencia en déficit como snack crunchy.' },
  { name: 'Pepino', proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, calsPer100g: 16, fiberPer100g: 0.5, category: 'veg', clientNote: 'Prácticamente agua. Come todo el que quieras.', trainerNote: 'Libre. Bueno para hidratación y volumen.' },
  { name: 'Lechuga romana', proteinPer100g: 1.2, carbsPer100g: 3.3, fatPer100g: 0.3, calsPer100g: 17, fiberPer100g: 2.1, category: 'veg', clientNote: 'Base perfecta para ensaladas grandes sin sumar calorías.', trainerNote: 'Libre. Usar como base para que el plato de déficit se vea grande.' },
  { name: 'Coliflor al vapor', proteinPer100g: 1.9, carbsPer100g: 5, fatPer100g: 0.3, calsPer100g: 25, fiberPer100g: 2, category: 'veg', clientNote: 'Se puede hacer arroz de coliflor para reemplazar arroz en corte.', trainerNote: 'Excelente truco: arroz de coliflor tiene 25kcal vs 130kcal del arroz real por 100g.', preferIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Habichuela / Judía verde', proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.1, calsPer100g: 31, fiberPer100g: 3.4, category: 'veg', clientNote: 'Saciante y baja en calorías. Buena como acompañamiento.', trainerNote: 'Buen vegetal para acompañar almuerzo y cena en déficit.' },
  { name: 'Apio', proteinPer100g: 0.7, carbsPer100g: 3, fatPer100g: 0.2, calsPer100g: 14, fiberPer100g: 1.6, category: 'veg', clientNote: 'Casi cero calorías. Perfecto con mantequilla de maní medida.', trainerNote: 'Libre. Crunch natural para snacks con porción controlada de grasa.' },

  // ===================== BEBIDAS =====================
  { name: 'Café negro sin azúcar', proteinPer100g: 0.1, carbsPer100g: 0, fatPer100g: 0, calsPer100g: 2, fiberPer100g: 0, category: 'drink', clientNote: 'Libre. Mejora enfoque y rendimiento antes de entrenar.', trainerNote: 'Máximo 3-4 tazas al día. No después de las 4pm para no afectar sueño.' },
  { name: 'Té verde sin azúcar', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, calsPer100g: 1, fiberPer100g: 0, category: 'drink', clientNote: 'Antioxidante y termogénico natural leve. Tómalo sin azúcar.', trainerNote: 'Complemento útil. No es quemador mágico pero ayuda en adherencia.' },
  { name: 'Agua de panela sin azúcar extra', proteinPer100g: 0, carbsPer100g: 5, fatPer100g: 0, calsPer100g: 20, fiberPer100g: 0, category: 'drink', clientNote: 'Bebida colombiana clásica. Bien diluida es baja en calorías.', trainerNote: 'Solo si está bien diluida. Muchos clientes le echan más panela sin reportar.' },
  { name: 'Leche de almendras sin azúcar', proteinPer100g: 0.4, carbsPer100g: 0.3, fatPer100g: 1.1, calsPer100g: 13, fiberPer100g: 0.2, category: 'drink', clientNote: 'Alternativa vegetal ultrabaja en calorías para batidos y café.', trainerNote: 'Prácticamente libre. Buena alternativa para intolerantes a lactosa.' },

  // ===================== SNACKS Y OTROS =====================
  { name: 'Galletas de arroz (unidad ~9g)', proteinPer100g: 7, carbsPer100g: 82, fatPer100g: 2.8, calsPer100g: 387, fiberPer100g: 3, category: 'snack', clientNote: 'Una galleta tiene ~35kcal. Buen vehículo para atún o mantequilla de maní medida.', trainerNote: 'Útil para snacks controlados. Enseñar que la galleta sola no sacia; combinar con proteína.' },
  { name: 'Chocolate oscuro 70%+ (cuadro ~10g)', proteinPer100g: 8, carbsPer100g: 46, fatPer100g: 43, calsPer100g: 598, fiberPer100g: 11, category: 'snack', clientNote: 'Un cuadrito de 10g son ~60kcal. Solo uno al día como premio, nunca la barra entera.', trainerNote: 'Herramienta de adherencia. Un cuadro de 10g puede salvar la dieta; la barra entera la destruye.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Palomitas naturales (sin mantequilla)', proteinPer100g: 11, carbsPer100g: 64, fatPer100g: 13, calsPer100g: 387, fiberPer100g: 13, category: 'snack', clientNote: 'Preparadas en aire son un snack de volumen. 30g llenan un tazón grande (~120kcal).', trainerNote: 'Sin mantequilla ni caramelo. Buena herramienta de adherencia en déficit para antojos de crunchy.' },
  { name: 'Hummus', proteinPer100g: 8, carbsPer100g: 14, fatPer100g: 10, calsPer100g: 166, fiberPer100g: 6, category: 'snack', clientNote: 'Bueno con vegetales. Máximo 2 cucharadas (~30g = 50kcal).', trainerNote: 'Solo medido. El cliente suele vaciar el recipiente sin darse cuenta.' },

  // ===================== BASE COLOMBIANA AMPLIADA =====================
  // Valores aproximados por cada 100g de porción comestible, pensados para planes prácticos en Colombia.
  { name: 'Pollo desmechado sin piel', proteinPer100g: 29, carbsPer100g: 0, fatPer100g: 4, calsPer100g: 155, fiberPer100g: 0, category: 'protein', clientNote: 'Proteína fácil para arepa, arroz o ensalada.', trainerNote: 'Muy útil para meal prep colombiano. Controlar salsas y aceite.' },
  { name: 'Muslo de pollo sin piel asado', proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 185, fiberPer100g: 0, category: 'protein', clientNote: 'Más jugoso que la pechuga. Quita la piel si buscas definir.', trainerNote: 'Buena adherencia. Ajustar grasas del día si el cliente usa muslo.' },
  { name: 'Carne de res desmechada magra', proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 180, fiberPer100g: 0, category: 'protein', clientNote: 'Ideal para almuerzo colombiano sin fritura.', trainerNote: 'Preferir cortes magros y cocción sin exceso de aceite.' },
  { name: 'Bistec de res magro a la plancha', proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 9, calsPer100g: 190, fiberPer100g: 0, category: 'protein', clientNote: 'Clásico y fácil de medir. Acompaña con arroz y ensalada.', trainerNote: 'Buena fuente de hierro. Evitar cortes grasos en déficit.' },
  { name: 'Sobrebarriga magra cocida', proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 11, calsPer100g: 205, fiberPer100g: 0, category: 'protein', clientNote: 'Se puede usar, pero controla porción y salsa.', trainerNote: 'Corte tradicional; puede subir grasa según preparación. Mejor cocida y escurrida.' },
  { name: 'Muchacho / posta de res magra', proteinPer100g: 28, carbsPer100g: 0, fatPer100g: 7, calsPer100g: 175, fiberPer100g: 0, category: 'protein', clientNote: 'Buena opción magra para almuerzo.', trainerNote: 'Corte práctico para porcionar. Útil en recomposición.' },
  { name: 'Carne de cerdo magra asada', proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 7, calsPer100g: 170, fiberPer100g: 0, category: 'protein', clientNote: 'Buena alternativa al pollo. Evita chicharrón y frituras.', trainerNote: 'Usar lomo/pernil magro. Controlar grasa visible.' },
  { name: 'Pernil de cerdo magro', proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 180, fiberPer100g: 0, category: 'protein', clientNote: 'Sirve para variar la dieta sin salirte del plan.', trainerNote: 'Revisar adobos con azúcar o exceso de sodio.' },
  { name: 'Chuleta de cerdo asada sin grasa visible', proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 10, calsPer100g: 195, fiberPer100g: 0, category: 'protein', clientNote: 'Mejor asada que frita. Quita el borde graso.', trainerNote: 'Apta si se controla cocción y porción.' },
  { name: 'Mojarra asada', proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 5, calsPer100g: 145, fiberPer100g: 0, category: 'protein', clientNote: 'Muy colombiana. Mejor asada que frita.', trainerNote: 'Excelente opción costeña si se evita fritura.' },
  { name: 'Bocachico asado', proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 6, calsPer100g: 150, fiberPer100g: 0, category: 'protein', clientNote: 'Pescado tradicional. Controla aceite y acompañamientos.', trainerNote: 'Aporta proteína de buena calidad; revisar espinas y preparación.' },
  { name: 'Merluza / pescado blanco', proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 2, calsPer100g: 115, fiberPer100g: 0, category: 'protein', clientNote: 'Ligero para cena. Fácil de combinar.', trainerNote: 'Muy útil en déficit por baja grasa.' },
  { name: 'Sardinas en agua escurridas', proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 180, fiberPer100g: 0, category: 'protein', clientNote: 'Prácticas y económicas. Revisa sodio.', trainerNote: 'Buena fuente de omega 3. Controlar frecuencia por sodio.' },

  { name: 'Fríjoles antioqueños cocidos', proteinPer100g: 8.7, carbsPer100g: 22, fatPer100g: 0.5, calsPer100g: 127, fiberPer100g: 7.4, category: 'carb', clientNote: 'Comida colombiana real. Excelente fibra, mide la porción.', trainerNote: 'Buena saciedad; cuidado con tocino, chicharrón o aceite del guiso.' },
  { name: 'Fríjol cargamanto guisado ligero', proteinPer100g: 8, carbsPer100g: 21, fatPer100g: 2, calsPer100g: 138, fiberPer100g: 7, category: 'carb', clientNote: 'Rico y saciante. Mejor con guiso ligero.', trainerNote: 'Registrar aceite si se usa hogao abundante.' },
  { name: 'Lentejas guisadas ligeras', proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 1.5, calsPer100g: 125, fiberPer100g: 8, category: 'carb', clientNote: 'Baratas, nutritivas y llenadoras.', trainerNote: 'Gran opción para adherencia y fibra. Combinar con proteína si el objetivo es alto en proteína.' },
  { name: 'Garbanzos guisados ligeros', proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6, calsPer100g: 164, fiberPer100g: 7.6, category: 'carb', clientNote: 'Muy saciantes. Úsalos medidos.', trainerNote: 'Carbohidrato con proteína vegetal. Alto en fibra.' },
  { name: 'Arveja verde cocida', proteinPer100g: 5.4, carbsPer100g: 14, fatPer100g: 0.4, calsPer100g: 84, fiberPer100g: 5.5, category: 'carb', clientNote: 'Buena para sopas y almuerzos.', trainerNote: 'Intermedia entre vegetal y carbohidrato. Medir si hay déficit estricto.' },
  { name: 'Mazorca cocida', proteinPer100g: 3.4, carbsPer100g: 21, fatPer100g: 1.5, calsPer100g: 96, fiberPer100g: 2.4, category: 'carb', clientNote: 'Buena opción colombiana. Evita mantequilla extra.', trainerNote: 'Útil como carbohidrato medido, no como vegetal libre.' },
  { name: 'Maíz peto cocido', proteinPer100g: 3.5, carbsPer100g: 24, fatPer100g: 1, calsPer100g: 116, fiberPer100g: 2.7, category: 'carb', clientNote: 'Energético. Controla porción en mazamorra.', trainerNote: 'Registrar leche/panela si se consume como bebida/postre.' },
  { name: 'Arepa paisa delgada', proteinPer100g: 5, carbsPer100g: 44, fatPer100g: 2.2, calsPer100g: 210, fiberPer100g: 2, category: 'carb', clientNote: 'Puedes comerla, pero sin mantequilla y con porción clara.', trainerNote: 'Mejor delgada y pesada. Vigilar rellenos.' },
  { name: 'Arepa de choclo pequeña', proteinPer100g: 5, carbsPer100g: 38, fatPer100g: 6, calsPer100g: 230, fiberPer100g: 2.5, category: 'carb', clientNote: 'Rica pero más calórica. Úsala como antojo medido.', trainerNote: 'Suele venir con queso/mantequilla. Registrar completo.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Patacón al horno', proteinPer100g: 1.5, carbsPer100g: 33, fatPer100g: 2, calsPer100g: 155, fiberPer100g: 3, category: 'carb', clientNote: 'Versión más controlada que frito.', trainerNote: 'Alternativa para adherencia si se evita freír.' },
  { name: 'Patacón frito escurrido', proteinPer100g: 1.5, carbsPer100g: 37, fatPer100g: 10, calsPer100g: 250, fiberPer100g: 3, category: 'snack', clientNote: 'Alto en calorías. Mejor ocasional y medido.', trainerNote: 'No usar como carbohidrato libre. Contabilizar grasa de fritura.', avoidIfGoalIncludes: ['grasa', 'definición'] },
  { name: 'Pasta integral cocida', proteinPer100g: 5.5, carbsPer100g: 27, fatPer100g: 1.3, calsPer100g: 140, fiberPer100g: 3.5, category: 'carb', clientNote: 'Más saciante que la pasta normal.', trainerNote: 'Buena opción post-entreno con proteína magra.' },
  { name: 'Pasta con salsa de tomate casera', proteinPer100g: 5, carbsPer100g: 24, fatPer100g: 2, calsPer100g: 135, fiberPer100g: 2.5, category: 'carb', clientNote: 'Se puede usar si la salsa no tiene crema ni mucho aceite.', trainerNote: 'Registrar aceite/queso aparte para precisión.' },
  { name: 'Ajiaco santafereño ligero', proteinPer100g: 6, carbsPer100g: 12, fatPer100g: 2, calsPer100g: 92, fiberPer100g: 1.8, category: 'carb', clientNote: 'Plato típico posible si controlas crema, alcaparras y porción.', trainerNote: 'Mixto; registrar pollo/papa si se requiere más precisión.' },
  { name: 'Sancocho de gallina ligero', proteinPer100g: 8, carbsPer100g: 11, fatPer100g: 3, calsPer100g: 105, fiberPer100g: 1.5, category: 'carb', clientNote: 'Comida familiar permitida con porción medida.', trainerNote: 'Mixto; controlar yuca, papa, plátano y piel de gallina.' },
  { name: 'Sudado de pollo con papa', proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 4, calsPer100g: 116, fiberPer100g: 1.2, category: 'protein', clientNote: 'Plato común y fácil de ajustar.', trainerNote: 'Registrar aceite y cantidad real de papa.' },
  { name: 'Bandeja paisa controlada', proteinPer100g: 10, carbsPer100g: 18, fatPer100g: 8, calsPer100g: 185, fiberPer100g: 4, category: 'snack', clientNote: 'No es prohibida, pero debe ser porción controlada y sin excesos.', trainerNote: 'Usar como comida libre planificada, no diaria.', avoidIfGoalIncludes: ['grasa', 'definición'] },

  { name: 'Queso cuajada', proteinPer100g: 17, carbsPer100g: 3, fatPer100g: 14, calsPer100g: 210, fiberPer100g: 0, category: 'dairy', clientNote: 'Muy común en Colombia. Usa una porción pequeña.', trainerNote: 'Alto en grasa comparado con proteína magra. Controlar 30-40g.' },
  { name: 'Queso mozzarella bajo en grasa', proteinPer100g: 24, carbsPer100g: 3, fatPer100g: 10, calsPer100g: 210, fiberPer100g: 0, category: 'dairy', clientNote: 'Mejor opción si quieres queso con más proteína.', trainerNote: 'Preferir bajo en grasa. Vigilar sodio.' },
  { name: 'Queso mozzarella tradicional', proteinPer100g: 22, carbsPer100g: 2, fatPer100g: 17, calsPer100g: 280, fiberPer100g: 0, category: 'dairy', clientNote: 'Sirve, pero mide la porción.', trainerNote: 'Más graso; usar cantidades pequeñas en déficit.' },
  { name: 'Queso doble crema', proteinPer100g: 20, carbsPer100g: 2, fatPer100g: 22, calsPer100g: 295, fiberPer100g: 0, category: 'dairy', clientNote: 'Rico pero calórico. No lo uses libremente.', trainerNote: 'Apto solo medido. No ideal para pérdida de grasa.', avoidIfGoalIncludes: ['grasa'] },
  { name: 'Queso costeño', proteinPer100g: 21, carbsPer100g: 2, fatPer100g: 21, calsPer100g: 290, fiberPer100g: 0, category: 'dairy', clientNote: 'Muy salado. Usa poquito.', trainerNote: 'Cuidar sodio/retención. No ideal en clientes hipertensos.' },
  { name: 'Kumis natural sin azúcar', proteinPer100g: 3.5, carbsPer100g: 5, fatPer100g: 1.5, calsPer100g: 48, fiberPer100g: 0, category: 'dairy', clientNote: 'Opción fresca si es sin azúcar.', trainerNote: 'Revisar etiqueta; muchos vienen endulzados.' },

  { name: 'Aguacate papelillo', proteinPer100g: 2, carbsPer100g: 8, fatPer100g: 13, calsPer100g: 150, fiberPer100g: 6, category: 'fat', clientNote: 'Grasa saludable, pero mide la porción.', trainerNote: 'Muy común en almuerzo colombiano. 50g suele ser suficiente.' },
  { name: 'Aceite de canola', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, calsPer100g: 884, fiberPer100g: 0, category: 'fat', clientNote: 'Usa poco. Una cucharada suma bastante.', trainerNote: 'Medir con cucharadita. El aceite invisible desbalancea dietas.' },

  { name: 'Ahuyama cocida', proteinPer100g: 1, carbsPer100g: 7, fatPer100g: 0.1, calsPer100g: 34, fiberPer100g: 1.5, category: 'veg', clientNote: 'Suave, económica y ligera.', trainerNote: 'Buena para sopas y volumen con pocas calorías.' },
  { name: 'Repollo blanco', proteinPer100g: 1.3, carbsPer100g: 6, fatPer100g: 0.1, calsPer100g: 25, fiberPer100g: 2.5, category: 'veg', clientNote: 'Barato y rendidor para ensaladas.', trainerNote: 'Libre; controlar aderezos.' },
  { name: 'Repollo morado', proteinPer100g: 1.4, carbsPer100g: 7, fatPer100g: 0.2, calsPer100g: 31, fiberPer100g: 2.1, category: 'veg', clientNote: 'Da color y saciedad al plato.', trainerNote: 'Excelente para adherencia visual.' },
  { name: 'Acelga cocida', proteinPer100g: 1.9, carbsPer100g: 3.7, fatPer100g: 0.1, calsPer100g: 20, fiberPer100g: 2.1, category: 'veg', clientNote: 'Ligera para saltear con huevo o pollo.', trainerNote: 'Libre en cenas y almuerzos.' },
  { name: 'Berenjena asada', proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.2, calsPer100g: 25, fiberPer100g: 3, category: 'veg', clientNote: 'Sacia bastante si la preparas sin mucho aceite.', trainerNote: 'Absorbe aceite; medir cocción.' },
  { name: 'Remolacha cocida', proteinPer100g: 1.7, carbsPer100g: 10, fatPer100g: 0.2, calsPer100g: 44, fiberPer100g: 2, category: 'veg', clientNote: 'Buena en ensalada, algo más dulce que otros vegetales.', trainerNote: 'No es libre ilimitado en déficit estricto, pero es buena opción.' },
  { name: 'Guatila / chayote cocido', proteinPer100g: 0.8, carbsPer100g: 4.5, fatPer100g: 0.1, calsPer100g: 22, fiberPer100g: 1.7, category: 'veg', clientNote: 'Muy ligera, buena para sopas.', trainerNote: 'Vegetal económico para volumen.' },
  { name: 'Cebolla larga', proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.2, calsPer100g: 32, fiberPer100g: 2.6, category: 'veg', clientNote: 'Sabor colombiano sin muchas calorías.', trainerNote: 'Libre como condimento.' },
  { name: 'Cilantro fresco', proteinPer100g: 2.1, carbsPer100g: 3.7, fatPer100g: 0.5, calsPer100g: 23, fiberPer100g: 2.8, category: 'veg', clientNote: 'Úsalo libre para sabor.', trainerNote: 'Aporta sabor sin salsas calóricas.' },

  { name: 'Guayaba', proteinPer100g: 2.6, carbsPer100g: 14, fatPer100g: 1, calsPer100g: 68, fiberPer100g: 5.4, category: 'fruit', clientNote: 'Fruta colombiana alta en fibra.', trainerNote: 'Muy buena en snacks por fibra.' },
  { name: 'Mora', proteinPer100g: 1.4, carbsPer100g: 10, fatPer100g: 0.5, calsPer100g: 43, fiberPer100g: 5.3, category: 'fruit', clientNote: 'Buena para batidos sin azúcar.', trainerNote: 'Revisar azúcar añadida en jugos.' },
  { name: 'Lulo', proteinPer100g: 0.7, carbsPer100g: 8, fatPer100g: 0.2, calsPer100g: 35, fiberPer100g: 2.6, category: 'fruit', clientNote: 'Ideal en jugo sin azúcar.', trainerNote: 'Registrar azúcar si el cliente endulza.' },
  { name: 'Tomate de árbol', proteinPer100g: 1.6, carbsPer100g: 11, fatPer100g: 0.3, calsPer100g: 48, fiberPer100g: 3.3, category: 'fruit', clientNote: 'Bueno en jugo natural sin azúcar.', trainerNote: 'Acompañar con proteína si se usa en snack.' },
  { name: 'Granadilla', proteinPer100g: 1.5, carbsPer100g: 17, fatPer100g: 0.5, calsPer100g: 75, fiberPer100g: 10, category: 'fruit', clientNote: 'Dulce y alta en fibra.', trainerNote: 'Buena para adherencia y digestión.' },

  { name: 'Agua de coco natural', proteinPer100g: 0.7, carbsPer100g: 3.7, fatPer100g: 0.2, calsPer100g: 19, fiberPer100g: 1.1, category: 'drink', clientNote: 'Refrescante. Mejor natural y sin azúcar.', trainerNote: 'Puede ayudar post-sudoración; controlar cantidad.' },
  { name: 'Limonada natural sin azúcar', proteinPer100g: 0.1, carbsPer100g: 2, fatPer100g: 0, calsPer100g: 8, fiberPer100g: 0.1, category: 'drink', clientNote: 'Buena alternativa a gaseosa.', trainerNote: 'Solo si no se endulza con azúcar/panela.' },
  { name: 'Mazamorra sin panela', proteinPer100g: 2.5, carbsPer100g: 15, fatPer100g: 1, calsPer100g: 78, fiberPer100g: 1.5, category: 'snack', clientNote: 'Tradicional, pero mide la porción.', trainerNote: 'Si agrega panela, registrar aparte.', avoidIfGoalIncludes: ['grasa'] },

  // ===================== DESPENSA COLOMBIANA Y SUPERMERCADOS =====================
  { name: 'Muslo de pollo sin piel cocido', proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 7, calsPer100g: 172, fiberPer100g: 0, category: 'protein', clientNote: 'Alternativa jugosa a la pechuga. Retira la piel para controlar la grasa.', trainerNote: 'Útil para adherencia y variedad; ajustar la porción por su mayor grasa.' },
  { name: 'Pollo desmechado cocido', proteinPer100g: 29, carbsPer100g: 0, fatPer100g: 4, calsPer100g: 158, fiberPer100g: 0, category: 'protein', clientNote: 'Práctico para arepas, ensaladas y almuerzos rápidos.', trainerNote: 'Preparar sin salsas cremosas y pesar ya cocido.' },
  { name: 'Carne de res para sudar magra cocida', proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 9, calsPer100g: 195, fiberPer100g: 0, category: 'protein', clientNote: 'Opción casera común. Retira la grasa visible.', trainerNote: 'El valor cambia según el corte; confirmar preparación y aceite.' },
  { name: 'Hígado de res cocido', proteinPer100g: 26, carbsPer100g: 5, fatPer100g: 4, calsPer100g: 165, fiberPer100g: 0, category: 'protein', clientNote: 'Muy rico en hierro y vitamina A. Una porción ocasional es suficiente.', trainerNote: 'No usar a diario; revisar condiciones médicas y tolerancia.' },
  { name: 'Chuleta de cerdo magra sin hueso', proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 185, fiberPer100g: 0, category: 'protein', clientNote: 'Fácil de conseguir y preparar a la plancha.', trainerNote: 'Evitar apanados y controlar cortes con grasa visible.' },
  { name: 'Atún en aceite escurrido', proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 8, calsPer100g: 180, fiberPer100g: 0, category: 'protein', clientNote: 'Práctico, pero más calórico que el atún en agua.', trainerNote: 'Escurrir bien y ajustar grasas del resto de la comida.' },
  { name: 'Sardinas en lata escurridas', proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 11, calsPer100g: 208, fiberPer100g: 0, category: 'protein', clientNote: 'Aportan proteína, calcio y omega 3.', trainerNote: 'Vigilar sodio y preferir porciones medidas.' },
  { name: 'Filete de merluza cocido', proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 2, calsPer100g: 120, fiberPer100g: 0, category: 'protein', clientNote: 'Pescado blanco ligero para almuerzo o cena.', trainerNote: 'Buena opción de déficit si se cocina sin fritura.' },
  { name: 'Jamón de cerdo bajo en grasa', proteinPer100g: 18, carbsPer100g: 3, fatPer100g: 4, calsPer100g: 120, fiberPer100g: 0, category: 'protein', clientNote: 'Útil para comidas rápidas, revisa el sodio.', trainerNote: 'Preferir versiones con mayor porcentaje de carne y menor sodio.' },
  { name: 'Salchicha de pollo cocida', proteinPer100g: 13, carbsPer100g: 5, fatPer100g: 15, calsPer100g: 210, fiberPer100g: 0, category: 'protein', clientNote: 'Producto práctico, pero procesado y alto en sodio.', trainerNote: 'Uso ocasional; revisar etiqueta porque cambia mucho por marca.' },
  { name: 'Mortadela tradicional', proteinPer100g: 12, carbsPer100g: 4, fatPer100g: 24, calsPer100g: 285, fiberPer100g: 0, category: 'protein', clientNote: 'Puede consumirse ocasionalmente en porción pequeña.', trainerNote: 'No priorizar como fuente principal de proteína.' },
  { name: 'Fríjol cargamanto cocido', proteinPer100g: 9, carbsPer100g: 24, fatPer100g: 0.6, calsPer100g: 135, fiberPer100g: 9, category: 'protein', clientNote: 'Aporta proteína vegetal, fibra y saciedad.', trainerNote: 'Medir porción si se acompaña con arroz, plátano o papa.' },
  { name: 'Fríjol rojo cocido', proteinPer100g: 8.7, carbsPer100g: 22.8, fatPer100g: 0.5, calsPer100g: 127, fiberPer100g: 7.4, category: 'protein', clientNote: 'Base de muchas comidas caseras colombianas.', trainerNote: 'Excelente fibra; controlar acompañamientos y grasa del guiso.' },
  { name: 'Garbanzo cocido', proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6, calsPer100g: 164, fiberPer100g: 7.6, category: 'protein', clientNote: 'Sirve para ensaladas, guisos o hummus.', trainerNote: 'Aporta proteína y carbohidrato; ajustar ambos macros.' },
  { name: 'Tofu firme', proteinPer100g: 14, carbsPer100g: 3, fatPer100g: 8, calsPer100g: 135, fiberPer100g: 2, category: 'protein', clientNote: 'Alternativa vegetal versátil.', trainerNote: 'Revisar etiqueta y ajustar preparación para mejorar adherencia.' },
  { name: 'Arepa blanca delgada', proteinPer100g: 6, carbsPer100g: 44, fatPer100g: 2, calsPer100g: 220, fiberPer100g: 4, category: 'carb', clientNote: 'Alimento cotidiano. Pesa la porción y evita exceso de mantequilla.', trainerNote: 'El tamaño varía mucho; registrar gramos reales o etiqueta.' },
  { name: 'Arepa de maíz amarillo', proteinPer100g: 6, carbsPer100g: 43, fatPer100g: 3, calsPer100g: 225, fiberPer100g: 4, category: 'carb', clientNote: 'Buena para desayuno o preentreno con proteína.', trainerNote: 'Controlar rellenos y grasas añadidas.' },
  { name: 'Arepa integral', proteinPer100g: 7, carbsPer100g: 40, fatPer100g: 3, calsPer100g: 215, fiberPer100g: 6, category: 'carb', clientNote: 'Más fibra que la versión tradicional.', trainerNote: 'Confirmar que realmente use harina integral y revisar etiqueta.' },
  { name: 'Harina de maíz precocida', proteinPer100g: 7, carbsPer100g: 79, fatPer100g: 1.5, calsPer100g: 360, fiberPer100g: 5, category: 'carb', clientNote: 'Base para preparar arepas; registra el peso seco usado.', trainerNote: 'No confundir gramos de harina seca con peso de arepa cocida.' },
  { name: 'Pan tajado blanco', proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2, calsPer100g: 265, fiberPer100g: 2.7, category: 'carb', clientNote: 'Práctico para desayunos y meriendas.', trainerNote: 'Usar etiqueta del producto y controlar acompañamientos.' },
  { name: 'Pan tajado integral', proteinPer100g: 11, carbsPer100g: 43, fatPer100g: 4, calsPer100g: 250, fiberPer100g: 7, category: 'carb', clientNote: 'Aporta más fibra y saciedad.', trainerNote: 'Elegir opciones donde el primer ingrediente sea harina integral.' },
  { name: 'Pan blandito colombiano', proteinPer100g: 8, carbsPer100g: 52, fatPer100g: 7, calsPer100g: 305, fiberPer100g: 2, category: 'carb', clientNote: 'Puede incluirse, pero suele tener azúcar y grasa añadida.', trainerNote: 'Porción ocasional; preferir pan simple o integral.' },
  { name: 'Tostadas horneadas', proteinPer100g: 10, carbsPer100g: 71, fatPer100g: 6, calsPer100g: 375, fiberPer100g: 4, category: 'carb', clientNote: 'Crujientes y prácticas, pero concentradas en calorías.', trainerNote: 'Registrar por unidades y confirmar gramos en la etiqueta.' },
  { name: 'Galletas de soda', proteinPer100g: 9, carbsPer100g: 70, fatPer100g: 12, calsPer100g: 420, fiberPer100g: 3, category: 'carb', clientNote: 'Fáciles de transportar; mide la porción.', trainerNote: 'No confundir alimento ligero con bajo en calorías.' },
  { name: 'Pasta cocida', proteinPer100g: 5.8, carbsPer100g: 31, fatPer100g: 1.1, calsPer100g: 158, fiberPer100g: 1.8, category: 'carb', clientNote: 'Base económica para almuerzos.', trainerNote: 'Pesar cocida y controlar salsa, queso y aceite.' },
  { name: 'Cuscús cocido', proteinPer100g: 3.8, carbsPer100g: 23, fatPer100g: 0.2, calsPer100g: 112, fiberPer100g: 1.4, category: 'carb', clientNote: 'Rápido de preparar y fácil de combinar.', trainerNote: 'Útil para variar arroz o pasta.' },
  { name: 'Quinua cocida', proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, calsPer100g: 120, fiberPer100g: 2.8, category: 'carb', clientNote: 'Aporta fibra y algo de proteína.', trainerNote: 'No considerarla proteína principal; contabilizar como carbohidrato.' },
  { name: 'Maíz dulce en lata escurrido', proteinPer100g: 3.4, carbsPer100g: 19, fatPer100g: 1.5, calsPer100g: 96, fiberPer100g: 2.7, category: 'carb', clientNote: 'Práctico para ensaladas y bowls.', trainerNote: 'Revisar sodio y azúcares añadidos.' },
  { name: 'Ñame cocido', proteinPer100g: 1.5, carbsPer100g: 28, fatPer100g: 0.2, calsPer100g: 118, fiberPer100g: 4.1, category: 'carb', clientNote: 'Tubérculo común en la costa colombiana.', trainerNote: 'Buena alternativa a papa o yuca con porción controlada.' },
  { name: 'Arracacha cocida', proteinPer100g: 1.2, carbsPer100g: 24, fatPer100g: 0.3, calsPer100g: 101, fiberPer100g: 2.6, category: 'carb', clientNote: 'Sabor suave y fácil digestión.', trainerNote: 'Útil para sopas o purés sin crema.' },
  { name: 'Papa pastusa cocida con cáscara', proteinPer100g: 2, carbsPer100g: 20, fatPer100g: 0.1, calsPer100g: 87, fiberPer100g: 2.1, category: 'carb', clientNote: 'Económica y saciante.', trainerNote: 'La cáscara aumenta fibra; evitar fritura.' },
  { name: 'Papa a la francesa congelada horneada', proteinPer100g: 3.4, carbsPer100g: 33, fatPer100g: 7, calsPer100g: 205, fiberPer100g: 3, category: 'carb', clientNote: 'Puede prepararse al horno o air fryer en porción medida.', trainerNote: 'Revisar etiqueta; algunas versiones traen aceite añadido.' },
  { name: 'Plátano maduro frito', proteinPer100g: 1.5, carbsPer100g: 36, fatPer100g: 10, calsPer100g: 240, fiberPer100g: 2.5, category: 'carb', clientNote: 'Muy común, pero la fritura aumenta mucho las calorías.', trainerNote: 'No usar como equivalente directo del plátano asado.' },
  { name: 'Patacón frito', proteinPer100g: 2, carbsPer100g: 39, fatPer100g: 12, calsPer100g: 270, fiberPer100g: 3.5, category: 'carb', clientNote: 'Producto tradicional de alta densidad calórica.', trainerNote: 'Uso ocasional y porción pequeña.' },
  { name: 'Granola comercial', proteinPer100g: 10, carbsPer100g: 64, fatPer100g: 15, calsPer100g: 430, fiberPer100g: 7, category: 'carb', clientNote: 'Práctica, pero suele ser alta en azúcar y grasa.', trainerNote: 'Revisar etiqueta; medir 25 a 40 g, no servir a ojo.' },
  { name: 'Cereal de maíz sin azúcar', proteinPer100g: 7, carbsPer100g: 84, fatPer100g: 1, calsPer100g: 370, fiberPer100g: 3, category: 'carb', clientNote: 'Rápido para desayuno, pero poco saciante solo.', trainerNote: 'Combinar con proteína y fruta; revisar azúcar añadida.' },
  { name: 'Cereal de chocolate', proteinPer100g: 6, carbsPer100g: 80, fatPer100g: 5, calsPer100g: 390, fiberPer100g: 4, category: 'snack', clientNote: 'Producto dulce para consumo ocasional.', trainerNote: 'No priorizar en déficit; usar etiqueta exacta.' },
  { name: 'Leche entera', proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, calsPer100g: 61, fiberPer100g: 0, category: 'dairy', clientNote: 'Útil en desayunos y batidos.', trainerNote: 'Ajustar grasa total del día.' },
  { name: 'Leche semidescremada', proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 1.8, calsPer100g: 47, fiberPer100g: 0, category: 'dairy', clientNote: 'Equilibrio entre sabor y calorías.', trainerNote: 'Buena opción cotidiana si hay tolerancia.' },
  { name: 'Leche descremada', proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 0.2, calsPer100g: 35, fiberPer100g: 0, category: 'dairy', clientNote: 'Aporta proteína y calcio con pocas grasas.', trainerNote: 'Útil en déficit o cuando faltan proteínas leves.' },
  { name: 'Leche deslactosada semidescremada', proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 1.8, calsPer100g: 47, fiberPer100g: 0, category: 'dairy', clientNote: 'Alternativa para personas con dificultad con la lactosa.', trainerNote: 'La lactosa reducida no significa menos calorías.' },
  { name: 'Yogur natural entero', proteinPer100g: 3.8, carbsPer100g: 5, fatPer100g: 3.3, calsPer100g: 65, fiberPer100g: 0, category: 'dairy', clientNote: 'Buena base para fruta o avena.', trainerNote: 'Evitar versiones con azúcar añadida si el plan es de déficit.' },
  { name: 'Yogur saborizado', proteinPer100g: 3.5, carbsPer100g: 15, fatPer100g: 2, calsPer100g: 95, fiberPer100g: 0, category: 'dairy', clientNote: 'Práctico, pero suele incluir azúcar.', trainerNote: 'Revisar etiqueta y diferenciarlo del yogur natural.' },
  { name: 'Kumis tradicional', proteinPer100g: 3.2, carbsPer100g: 12, fatPer100g: 2.5, calsPer100g: 82, fiberPer100g: 0, category: 'dairy', clientNote: 'Bebida láctea común en Colombia.', trainerNote: 'Frecuentemente contiene azúcar; usar etiqueta exacta.' },
  { name: 'Queso campesino', proteinPer100g: 18, carbsPer100g: 2, fatPer100g: 20, calsPer100g: 260, fiberPer100g: 0, category: 'dairy', clientNote: 'Aporta proteína, pero también grasa y sodio.', trainerNote: 'Medir porción de 30 a 50 g según objetivo.' },
  { name: 'Quesito fresco', proteinPer100g: 16, carbsPer100g: 3, fatPer100g: 18, calsPer100g: 235, fiberPer100g: 0, category: 'dairy', clientNote: 'Común para arepas y desayunos.', trainerNote: 'Controlar porción y revisar sodio.' },
  { name: 'Queso mozzarella', proteinPer100g: 24, carbsPer100g: 3, fatPer100g: 22, calsPer100g: 300, fiberPer100g: 0, category: 'dairy', clientNote: 'Buena proteína, pero concentrado en grasa.', trainerNote: 'Usar porciones pequeñas o versión reducida en grasa.' },
  { name: 'Queso crema', proteinPer100g: 6, carbsPer100g: 4, fatPer100g: 30, calsPer100g: 300, fiberPer100g: 0, category: 'dairy', clientNote: 'Úsalo como acompañamiento medido.', trainerNote: 'No contar como fuente principal de proteína.' },
  { name: 'Mantequilla', proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81, calsPer100g: 717, fiberPer100g: 0, category: 'fat', clientNote: 'Muy concentrada en calorías. Una cucharadita puede ser suficiente.', trainerNote: 'Registrar gramos, no cucharadas aproximadas.' },
  { name: 'Margarina', proteinPer100g: 0.2, carbsPer100g: 0.5, fatPer100g: 80, calsPer100g: 720, fiberPer100g: 0, category: 'fat', clientNote: 'Producto concentrado en grasa.', trainerNote: 'Revisar etiqueta y preferir pequeñas cantidades.' },
  { name: 'Aceite vegetal', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, calsPer100g: 884, fiberPer100g: 0, category: 'fat', clientNote: 'Una cucharada suma muchas calorías. Mídelo siempre.', trainerNote: 'Pesar o medir con cucharita; es una fuente frecuente de error.' },
  { name: 'Mayonesa', proteinPer100g: 1, carbsPer100g: 1, fatPer100g: 75, calsPer100g: 680, fiberPer100g: 0, category: 'fat', clientNote: 'Usa porciones pequeñas o una versión ligera.', trainerNote: 'Alta densidad calórica; registrar por gramos.' },
  { name: 'Mayonesa ligera', proteinPer100g: 1, carbsPer100g: 8, fatPer100g: 25, calsPer100g: 270, fiberPer100g: 0, category: 'fat', clientNote: 'Menos grasa que la tradicional, pero sigue requiriendo medida.', trainerNote: 'La formulación cambia por marca; usar etiqueta.' },
  { name: 'Mantequilla de maní', proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, calsPer100g: 590, fiberPer100g: 6, category: 'fat', clientNote: 'Nutritiva y saciante, pero muy calórica.', trainerNote: 'Medir 10 a 20 g; no servir directamente del frasco.' },
  { name: 'Maní tostado sin sal', proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, calsPer100g: 585, fiberPer100g: 8, category: 'fat', clientNote: 'Snack nutritivo en porción pequeña.', trainerNote: 'Controlar 15 a 30 g por su alta densidad calórica.' },
  { name: 'Banano común', proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, calsPer100g: 89, fiberPer100g: 2.6, category: 'fruit', clientNote: 'Práctico para preentreno o merienda.', trainerNote: 'Contabilizar por peso sin cáscara.' },
  { name: 'Manzana roja con cáscara', proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, calsPer100g: 52, fiberPer100g: 2.4, category: 'fruit', clientNote: 'Fácil de transportar y saciante.', trainerNote: 'Buena opción cotidiana en déficit.' },
  { name: 'Naranja', proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, calsPer100g: 47, fiberPer100g: 2.4, category: 'fruit', clientNote: 'Mejor entera que en jugo para conservar fibra.', trainerNote: 'Evitar convertir varias unidades en jugo sin contabilizar.' },
  { name: 'Mango maduro', proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, calsPer100g: 60, fiberPer100g: 1.6, category: 'fruit', clientNote: 'Dulce natural; mide la porción.', trainerNote: 'Útil preentreno, pero fácil de exceder por tamaño.' },
  { name: 'Maracuyá pulpa', proteinPer100g: 2.2, carbsPer100g: 23, fatPer100g: 0.7, calsPer100g: 97, fiberPer100g: 10, category: 'fruit', clientNote: 'Sabor intenso para agua o yogur.', trainerNote: 'Evitar azúcar añadida; la pulpa es concentrada.' },
  { name: 'Tomate chonto', proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, calsPer100g: 18, fiberPer100g: 1.2, category: 'veg', clientNote: 'Base de ensaladas y guisos con pocas calorías.', trainerNote: 'Contabilizar aceites y salsas, no solo el tomate.' },
  { name: 'Pepino cohombro', proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, calsPer100g: 15, fiberPer100g: 0.5, category: 'veg', clientNote: 'Muy ligero y refrescante.', trainerNote: 'Ideal para aumentar volumen del plato.' },
  { name: 'Lechuga', proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, calsPer100g: 15, fiberPer100g: 1.3, category: 'veg', clientNote: 'Base ligera para ensaladas.', trainerNote: 'Cuidar aderezos y toppings.' },
  { name: 'Brócoli cocido', proteinPer100g: 2.4, carbsPer100g: 7.2, fatPer100g: 0.4, calsPer100g: 35, fiberPer100g: 3.3, category: 'veg', clientNote: 'Aporta fibra y volumen.', trainerNote: 'Buena guarnición para déficit o recomposición.' },
  { name: 'Coliflor cocida', proteinPer100g: 1.8, carbsPer100g: 4.1, fatPer100g: 0.5, calsPer100g: 23, fiberPer100g: 2.3, category: 'veg', clientNote: 'Alternativa ligera para purés o arroz de coliflor.', trainerNote: 'Evitar salsas cremosas si se busca bajar calorías.' },
  { name: 'Espinaca cocida', proteinPer100g: 3, carbsPer100g: 3.8, fatPer100g: 0.3, calsPer100g: 23, fiberPer100g: 2.4, category: 'veg', clientNote: 'Aporta micronutrientes y poco volumen calórico.', trainerNote: 'Combinar con proteína; vigilar aceite de cocción.' },
  { name: 'Habichuela cocida', proteinPer100g: 1.9, carbsPer100g: 7, fatPer100g: 0.3, calsPer100g: 35, fiberPer100g: 3.2, category: 'veg', clientNote: 'Económica y común en almuerzos.', trainerNote: 'Buena para aumentar fibra y saciedad.' },
  { name: 'Repollo crudo', proteinPer100g: 1.3, carbsPer100g: 5.8, fatPer100g: 0.1, calsPer100g: 25, fiberPer100g: 2.5, category: 'veg', clientNote: 'Rinde mucho y sirve para ensaladas.', trainerNote: 'Controlar mayonesa en preparaciones tipo coleslaw.' },
  { name: 'Agua de panela preparada', proteinPer100g: 0, carbsPer100g: 12, fatPer100g: 0, calsPer100g: 48, fiberPer100g: 0, category: 'drink', clientNote: 'Bebida tradicional con azúcar. Cuenta dentro de los carbohidratos.', trainerNote: 'El valor depende de la cantidad de panela; evitar servir libremente.' },
  { name: 'Gaseosa regular', proteinPer100g: 0, carbsPer100g: 10.6, fatPer100g: 0, calsPer100g: 42, fiberPer100g: 0, category: 'drink', clientNote: 'Aporta azúcar sin saciedad. Mejor reservar para ocasiones.', trainerNote: 'No recomendar como hidratación habitual.' },
  { name: 'Gaseosa sin azúcar', proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, calsPer100g: 1, fiberPer100g: 0, category: 'drink', clientNote: 'Alternativa ocasional sin calorías significativas.', trainerNote: 'No reemplaza el agua; revisar tolerancia y hábitos.' },
  { name: 'Jugo de naranja envasado', proteinPer100g: 0.7, carbsPer100g: 10, fatPer100g: 0.2, calsPer100g: 45, fiberPer100g: 0.2, category: 'drink', clientNote: 'Revisa si tiene azúcar añadida.', trainerNote: 'Preferir fruta entera; usar etiqueta exacta.' },
  { name: 'Chocolate de mesa preparado con agua', proteinPer100g: 1.2, carbsPer100g: 14, fatPer100g: 2.5, calsPer100g: 82, fiberPer100g: 1.2, category: 'drink', clientNote: 'Bebida tradicional; registra azúcar y cantidad de chocolate.', trainerNote: 'Puede variar mucho; usar receta real o etiqueta.' },
  { name: 'Palomitas de maíz caseras sin mantequilla', proteinPer100g: 12, carbsPer100g: 65, fatPer100g: 5, calsPer100g: 370, fiberPer100g: 14, category: 'snack', clientNote: 'Snack con buen volumen cuando se mide el aceite.', trainerNote: 'Registrar maíz seco y aceite por separado.' },
  { name: 'Papas fritas de paquete', proteinPer100g: 6, carbsPer100g: 52, fatPer100g: 34, calsPer100g: 540, fiberPer100g: 4, category: 'snack', clientNote: 'Producto ocasional, alto en grasa y sodio.', trainerNote: 'No usar como carbohidrato habitual.' },
  { name: 'Chocorramo o ponqué cubierto', proteinPer100g: 5, carbsPer100g: 58, fatPer100g: 25, calsPer100g: 475, fiberPer100g: 2, category: 'snack', clientNote: 'Postre común de alta densidad calórica.', trainerNote: 'Registrar por unidad y reservar para planificación flexible.' },
  { name: 'Galletas dulces rellenas', proteinPer100g: 5, carbsPer100g: 69, fatPer100g: 20, calsPer100g: 475, fiberPer100g: 3, category: 'snack', clientNote: 'Fáciles de exceder; sirve una porción definida.', trainerNote: 'Usar etiqueta específica por marca.' },
  { name: 'Gelatina sin azúcar preparada', proteinPer100g: 2, carbsPer100g: 1, fatPer100g: 0, calsPer100g: 12, fiberPer100g: 0, category: 'snack', clientNote: 'Postre ligero para controlar antojos.', trainerNote: 'No aporta proteína relevante aunque contenga gelatina.' },
  { name: 'Barra de cereal comercial', proteinPer100g: 6, carbsPer100g: 70, fatPer100g: 10, calsPer100g: 390, fiberPer100g: 5, category: 'snack', clientNote: 'Práctica, pero puede contener bastante azúcar.', trainerNote: 'Revisar etiqueta y no asumir que es alta en proteína.' },

];

// ============================================================
// BASE DE DATOS DE RUTINAS COMPLETAS - IMPERIAL FITNESS
// Plantillas para 5 objetivos distintos con 4-6 días cada una,
// ejercicios detallados, series, repeticiones e instrucciones.
// ============================================================

export interface RoutineTemplate {
  id: string;
  title: string;
  targetGoal: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  daysPerWeek: number;
  description: string;
  trainerRationale: string;
  days: {
    day: string;
    focus: string;
    warmup: string;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      rest: string;
      tempo?: string;
      notes?: string;
    }[];
    cooldown: string;
  }[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'rt-fat-loss',
    title: 'Corte Imperial: Pérdida de Grasa Avanzada',
    targetGoal: 'Pérdida de Grasa',
    level: 'Intermedio',
    daysPerWeek: 5,
    description: 'Rutina orientada a maximizar gasto calórico, preservar masa muscular durante déficit y mejorar acondicionamiento cardiovascular.',
    trainerRationale: 'Se combina fuerza compuesta con circuitos metabólicos para elevar el EPOC (consumo de oxígeno post-ejercicio) y mantener la tasa metabólica activa en déficit calórico.',
    days: [
      {
        day: 'Día 1: Tren Inferior Compuesto',
        focus: 'Cuádriceps, Glúteos, Isquiotibiales',
        warmup: '10 min bicicleta estática a ritmo moderado + movilidad de cadera',
        exercises: [
          { name: 'Sentadilla Goblet con Mancuerna', sets: 4, reps: '12-15', rest: '60s', tempo: '3-1-2', notes: 'Codos entre rodillas, profundidad controlada' },
          { name: 'Prensa 45° Pies Separados', sets: 4, reps: '15', rest: '60s', notes: 'No bloquear rodillas al extender' },
          { name: 'Peso Muerto Rumano con Barra', sets: 4, reps: '12', rest: '75s', tempo: '4-0-1', notes: 'Bajada lenta, sentir el estiramiento en isquios' },
          { name: 'Zancadas Caminando con Mancuernas', sets: 3, reps: '12 por pierna', rest: '60s', notes: 'Rodilla trasera casi toca el piso' },
          { name: 'Elevación de Pantorrilla en Máquina', sets: 4, reps: '20', rest: '45s', notes: 'Pausa de 2s arriba' },
          { name: 'Circuito Metabólico: Burpees + Mountain Climbers', sets: 3, reps: '30s cada uno', rest: '90s', notes: 'Máximo esfuerzo durante los 30s' }
        ],
        cooldown: '5 min caminata en banda + estiramientos de cuádriceps, isquios y cadera'
      },
      {
        day: 'Día 2: Empuje (Pecho, Hombro, Tríceps)',
        focus: 'Pectoral, Deltoides, Tríceps',
        warmup: '5 min remo ergómetro + rotaciones de hombro con banda',
        exercises: [
          { name: 'Press de Pecho en Máquina o Banco Plano', sets: 4, reps: '12', rest: '60s', tempo: '3-1-1', notes: 'Retracción escapular durante toda la serie' },
          { name: 'Press Inclinado con Mancuernas', sets: 3, reps: '12', rest: '60s', notes: 'Ángulo de 30-35° en el banco' },
          { name: 'Aperturas con Cable Cruzado', sets: 3, reps: '15', rest: '45s', notes: 'Mantener ligera flexión de codos constante' },
          { name: 'Press Militar con Mancuernas Sentado', sets: 4, reps: '12', rest: '60s', notes: 'No arquear la espalda baja' },
          { name: 'Elevaciones Laterales', sets: 4, reps: '15', rest: '45s', tempo: '2-1-3', notes: 'Bajada más lenta que la subida' },
          { name: 'Extensiones de Tríceps en Polea', sets: 3, reps: '15', rest: '45s', notes: 'Apretar 1 segundo al final' }
        ],
        cooldown: '5 min caminata + estiramientos de pectoral y hombro'
      },
      {
        day: 'Día 3: Tracción (Espalda, Bíceps)',
        focus: 'Dorsal, Romboides, Bíceps',
        warmup: '5 min elíptica + activación de escápula con banda',
        exercises: [
          { name: 'Jalón al Pecho con Agarre Ancho', sets: 4, reps: '12', rest: '60s', notes: 'Llevar barra al pecho, no atrás del cuello' },
          { name: 'Remo con Barra inclinado', sets: 4, reps: '10', rest: '75s', tempo: '2-1-3', notes: 'Torso a 45°, codos pegados al cuerpo' },
          { name: 'Remo Sentado en Polea con Agarre Neutro', sets: 3, reps: '12', rest: '60s', notes: 'Apretar escápulas 2 segundos al final' },
          { name: 'Face Pulls', sets: 4, reps: '20', rest: '45s', notes: 'Crítico para salud de hombro. No saltarse' },
          { name: 'Curl de Bíceps con Barra', sets: 3, reps: '12', rest: '45s', notes: 'Sin balanceo de tronco' },
          { name: 'Curl Martillo con Mancuernas', sets: 3, reps: '12', rest: '45s', notes: 'Trabaja braquiorradial además de bíceps' }
        ],
        cooldown: '5 min caminata + estiramientos de dorsal y bíceps'
      },
      {
        day: 'Día 4: Cadena Posterior y Core',
        focus: 'Glúteos, Isquiotibiales, Abdomen',
        warmup: '5 min escaladora + puentes de glúteo con banda',
        exercises: [
          { name: 'Hip Thrust con Barra', sets: 4, reps: '12', rest: '75s', tempo: '2-2-1', notes: 'Pausa de 2s arriba en contracción' },
          { name: 'Peso Muerto Sumo con Mancuerna', sets: 4, reps: '12', rest: '60s', notes: 'Pies más anchos que hombros, puntas afuera' },
          { name: 'Curl Femoral Acostado en Máquina', sets: 3, reps: '15', rest: '45s', notes: 'No levantar la cadera del pad' },
          { name: 'Buenos Días con Barra (peso ligero)', sets: 3, reps: '12', rest: '60s', notes: 'Solo si no hay dolor lumbar. Peso conservador' },
          { name: 'Plancha Frontal', sets: 3, reps: '45 segundos', rest: '45s', notes: 'Contraer glúteo y abdomen, no dejar caer la cadera' },
          { name: 'Crunch en Polea Alta de Rodillas', sets: 3, reps: '15', rest: '45s', notes: 'Flexionar el tronco, no jalar con los brazos' },
          { name: 'Plancha Lateral', sets: 2, reps: '30s por lado', rest: '30s', notes: 'Cadera arriba, línea recta de cabeza a pies' }
        ],
        cooldown: 'Estiramientos de cadera, isquios y zona lumbar 5 min'
      },
      {
        day: 'Día 5: Full Body Metabólico + Cardio',
        focus: 'Acondicionamiento General y Quema Calórica',
        warmup: '3 min salto de cuerda + movilidad general',
        exercises: [
          { name: 'Circuito 1: Sentadilla + Press con Mancuernas', sets: 4, reps: '10', rest: '30s entre ejercicios, 90s entre rondas', notes: 'Sin soltar las mancuernas entre ejercicios' },
          { name: 'Circuito 2: Remo con Mancuerna + Burpees', sets: 4, reps: '10 + 8', rest: '30s / 90s', notes: 'Intensidad alta, descanso corto' },
          { name: 'Circuito 3: Kettlebell Swing + Mountain Climbers', sets: 3, reps: '15 + 20', rest: '30s / 90s', notes: 'Cadera como motor del swing, no brazos' },
          { name: 'HIIT en Remo Ergómetro', sets: 1, reps: '8 rondas: 30s máx / 60s suave', rest: 'Dentro del ejercicio', notes: 'Terminar con 3 min de enfriamiento' }
        ],
        cooldown: 'Caminata 5 min + estiramientos generales de todo el cuerpo'
      }
    ]
  },
  {
    id: 'rt-hypertrophy',
    title: 'Imperial Mass: Hipertrofia Muscular',
    targetGoal: 'Hipertrofia',
    level: 'Intermedio',
    daysPerWeek: 5,
    description: 'Rutina push/pull/legs optimizada para máximo crecimiento muscular con volumen progresivo y tiempo bajo tensión controlado.',
    trainerRationale: 'Se prioriza la tensión mecánica y el estrés metabólico con tempos controlados, drop sets y series al fallo técnico para estimular hipertrofia sarcoplasmática y miofibrilar.',
    days: [
      {
        day: 'Día 1: Pecho y Tríceps (Empuje Pesado)',
        focus: 'Pectoral Mayor, Tríceps',
        warmup: 'Rotaciones de hombro + 2 series ligeras de press',
        exercises: [
          { name: 'Press de Banca Plano con Barra', sets: 4, reps: '8-10', rest: '90s', tempo: '3-1-1', notes: 'Última serie al fallo técnico' },
          { name: 'Press Inclinado con Mancuernas', sets: 4, reps: '10-12', rest: '75s', notes: 'Estiramiento completo abajo' },
          { name: 'Cruces en Polea Alta', sets: 3, reps: '12-15', rest: '60s', notes: 'Apretar pectoral 1 segundo al cruzar' },
          { name: 'Fondos en Paralelas (peso corporal o asistido)', sets: 3, reps: '10-12', rest: '75s', notes: 'Inclinación frontal para énfasis en pecho' },
          { name: 'Press Francés con Barra EZ', sets: 3, reps: '12', rest: '60s', notes: 'Codos fijos, solo se mueve el antebrazo' },
          { name: 'Extensiones de Tríceps en Polea (cuerda)', sets: 3, reps: '15 + drop set final', rest: '45s', notes: 'Drop set: bajar peso 30% y seguir hasta fallo' }
        ],
        cooldown: 'Estiramientos de pectoral en marco de puerta 60s por lado'
      },
      {
        day: 'Día 2: Espalda y Bíceps (Tracción Pesada)',
        focus: 'Dorsal, Trapecios, Bíceps',
        warmup: 'Activación de escápula + remo ligero 2 series',
        exercises: [
          { name: 'Dominadas (o Jalón al Pecho asistido)', sets: 4, reps: '8-10', rest: '90s', notes: 'Agarre pronado ancho. Ir al fallo en la última serie' },
          { name: 'Remo con Barra Prona', sets: 4, reps: '10', rest: '75s', tempo: '2-1-3', notes: 'Bajada 3 segundos para máxima tensión' },
          { name: 'Remo Unilateral con Mancuerna', sets: 3, reps: '10 por lado', rest: '60s', notes: 'Codo pegado al cuerpo, apretar escápula' },
          { name: 'Pullover con Mancuerna', sets: 3, reps: '12', rest: '60s', notes: 'Estiramiento profundo del dorsal' },
          { name: 'Curl con Barra EZ', sets: 3, reps: '10-12', rest: '60s', notes: 'Sin balanceo. Fase excéntrica controlada' },
          { name: 'Curl Concentrado Sentado', sets: 3, reps: '12 + drop set final', rest: '45s', notes: 'Aislar el bíceps contra el muslo' }
        ],
        cooldown: 'Estiramientos de dorsal y bíceps 5 min'
      },
      {
        day: 'Día 3: Piernas Pesado (Cuádriceps dominante)',
        focus: 'Cuádriceps, Glúteos, Pantorrillas',
        warmup: '10 min bicicleta + series de extensiones ligeras',
        exercises: [
          { name: 'Sentadilla con Barra (Back Squat)', sets: 5, reps: '6-8', rest: '120s', notes: 'Profundidad mínima: paralelo. Última serie al fallo' },
          { name: 'Prensa Inclinada Pies Juntos', sets: 4, reps: '12', rest: '75s', notes: 'Énfasis en cuádriceps con pies bajos' },
          { name: 'Extensiones de Cuádriceps', sets: 4, reps: '15', rest: '60s', tempo: '2-2-1', notes: 'Pausa de 2s arriba en extensión completa' },
          { name: 'Sentadilla Búlgara con Mancuernas', sets: 3, reps: '10 por pierna', rest: '60s', notes: 'Pie delantero elevado para mayor rango' },
          { name: 'Elevación de Pantorrilla de Pie', sets: 4, reps: '15-20', rest: '45s', tempo: '2-2-1', notes: 'Estiramiento completo abajo, pausa arriba' }
        ],
        cooldown: 'Foam roller en cuádriceps e isquios + estiramientos estáticos'
      },
      {
        day: 'Día 4: Hombros y Trapecio',
        focus: 'Deltoides Anterior, Lateral, Posterior, Trapecio',
        warmup: 'Band pull-aparts + rotaciones externas con banda',
        exercises: [
          { name: 'Press Militar con Barra de Pie', sets: 4, reps: '8-10', rest: '90s', notes: 'Core apretado, sin inclinar el torso atrás' },
          { name: 'Elevaciones Laterales con Mancuernas', sets: 4, reps: '15', rest: '45s', tempo: '2-1-3', notes: 'Bajada lenta de 3 segundos' },
          { name: 'Elevaciones Frontales Alternas', sets: 3, reps: '12 por brazo', rest: '45s', notes: 'Solo hasta la altura de los ojos' },
          { name: 'Pájaros (Deltoides Posterior) con Mancuernas', sets: 4, reps: '15', rest: '45s', notes: 'Torso paralelo al piso. Apretar escápulas' },
          { name: 'Encogimientos con Mancuernas (Trapecio)', sets: 4, reps: '12', rest: '60s', tempo: '2-2-0', notes: 'Subir hombros hacia las orejas, pausa 2s arriba' },
          { name: 'Face Pulls con Cuerda', sets: 3, reps: '20', rest: '45s', notes: 'Salud de hombro. Rotación externa al final' }
        ],
        cooldown: 'Estiramientos de deltoides y trapecio 5 min'
      },
      {
        day: 'Día 5: Isquiotibiales, Glúteos y Abdomen',
        focus: 'Cadena Posterior y Core',
        warmup: 'Puentes de glúteo + activación de isquiotibiales con banda',
        exercises: [
          { name: 'Peso Muerto Convencional con Barra', sets: 5, reps: '5-6', rest: '120s', notes: 'Técnica perfecta obligatoria. Core sólido todo el movimiento' },
          { name: 'Hip Thrust con Barra', sets: 4, reps: '10-12', rest: '75s', tempo: '2-2-1', notes: 'Pausa arriba de 2s, apretar glúteo al máximo' },
          { name: 'Curl Femoral Acostado', sets: 4, reps: '12', rest: '60s', notes: 'No levantar la cadera del pad' },
          { name: 'Hiperextensiones con Peso', sets: 3, reps: '15', rest: '60s', notes: 'Disco en el pecho, subir hasta neutro, no hiperextender' },
          { name: 'Crunch en Polea de Rodillas', sets: 4, reps: '15', rest: '45s', notes: 'Flexionar el tronco hacia las rodillas' },
          { name: 'Rueda Abdominal (Ab Wheel)', sets: 3, reps: '10-12', rest: '60s', notes: 'Core apretado, no dejar caer la cadera' }
        ],
        cooldown: 'Estiramientos profundos de cadena posterior 5 min'
      }
    ]
  },
  {
    id: 'rt-strength',
    title: 'Imperial Power: Fuerza Máxima',
    targetGoal: 'Fuerza',
    level: 'Avanzado',
    daysPerWeek: 4,
    description: 'Programa basado en los movimientos fundamentales (sentadilla, press, peso muerto, remo) con progresión lineal de cargas.',
    trainerRationale: 'Enfoque en reclutamiento de fibras tipo II con cargas pesadas (80-90% 1RM), descansos largos y bajo volumen. Incluye trabajo accesorio para prevenir lesiones.',
    days: [
      {
        day: 'Día 1: Sentadilla + Accesorios de Pierna',
        focus: 'Fuerza de Tren Inferior',
        warmup: 'Movilidad de tobillo y cadera + 3 series progresivas de sentadilla con barra',
        exercises: [
          { name: 'Sentadilla con Barra (Back Squat)', sets: 5, reps: '5', rest: '180s', notes: 'Peso objetivo: 80-85% de tu máximo. Técnica impecable' },
          { name: 'Sentadilla Frontal (Front Squat)', sets: 3, reps: '6', rest: '120s', notes: 'Complemento para cuádriceps y core' },
          { name: 'Prensa Inclinada', sets: 3, reps: '8-10', rest: '90s', notes: 'Accesorio para volumen después del trabajo pesado' },
          { name: 'Extensiones de Cuádriceps', sets: 3, reps: '12', rest: '60s', notes: 'Trabajo aislado sin impacto articular' },
          { name: 'Plancha con Peso', sets: 3, reps: '60 segundos', rest: '60s', notes: 'Core fuerte = sentadilla fuerte. Disco en la espalda' }
        ],
        cooldown: 'Foam roller extensivo en cuádriceps, aductores, glúteos'
      },
      {
        day: 'Día 2: Press de Banca + Empuje',
        focus: 'Fuerza de Empuje Horizontal y Vertical',
        warmup: 'Rotaciones de hombro + 3 series progresivas de press con barra',
        exercises: [
          { name: 'Press de Banca Plano con Barra', sets: 5, reps: '5', rest: '180s', notes: '80-85% de tu máximo. Pedir seguro si es necesario' },
          { name: 'Press Militar de Pie con Barra', sets: 4, reps: '6', rest: '120s', notes: 'Sin impulso de piernas. Fuerza pura de hombro' },
          { name: 'Press Inclinado con Mancuernas', sets: 3, reps: '8', rest: '90s', notes: 'Accesorio para pectoral superior' },
          { name: 'Fondos en Paralelas con Peso', sets: 3, reps: '8', rest: '90s', notes: 'Agregar peso con cinturón si el corporal es fácil' },
          { name: 'Extensiones de Tríceps en Polea', sets: 3, reps: '12', rest: '60s', notes: 'Accesorio para bloqueo del press' }
        ],
        cooldown: 'Estiramientos de pectoral, deltoides anterior y tríceps'
      },
      {
        day: 'Día 3: Peso Muerto + Cadena Posterior',
        focus: 'Fuerza de Tracción desde el Piso',
        warmup: 'Activación de glúteo + 3 series progresivas de peso muerto',
        exercises: [
          { name: 'Peso Muerto Convencional', sets: 5, reps: '3-5', rest: '180-240s', notes: '85-90% de tu máximo. Cinturón permitido. Técnica perfecta obligatoria' },
          { name: 'Peso Muerto Rumano con Barra', sets: 3, reps: '8', rest: '90s', notes: 'Accesorio para isquiotibiales y grip' },
          { name: 'Remo Pendlay (desde el piso)', sets: 4, reps: '5', rest: '90s', notes: 'Barra regresa al piso en cada rep. Potencia de tracción' },
          { name: 'Curl Femoral', sets: 3, reps: '12', rest: '60s', notes: 'Trabajo aislado para isquios' },
          { name: 'Farmer Walks (Caminata con Peso)', sets: 3, reps: '30 metros', rest: '90s', notes: 'Grip, core y estabilidad total. Peso pesado' }
        ],
        cooldown: 'Estiramientos de cadena posterior y zona lumbar'
      },
      {
        day: 'Día 4: Tracción + Accesorios Generales',
        focus: 'Espalda, Bíceps, Prevención',
        warmup: 'Band pull-aparts + series ligeras de jalón',
        exercises: [
          { name: 'Dominadas con Peso Adicional', sets: 4, reps: '5-6', rest: '120s', notes: 'Peso en cinturón o mancuerna entre pies' },
          { name: 'Remo con Barra Prona', sets: 4, reps: '6-8', rest: '90s', notes: 'Pesado pero con control. Sin balanceo' },
          { name: 'Face Pulls', sets: 4, reps: '20', rest: '45s', notes: 'Prevención de hombro. No saltarse nunca' },
          { name: 'Curl con Barra', sets: 3, reps: '10', rest: '60s', notes: 'Accesorio para bíceps' },
          { name: 'Ejercicios Correctivos de Hombro', sets: 2, reps: '15', rest: '45s', notes: 'Rotaciones externas con banda ligera. Salud articular' }
        ],
        cooldown: 'Movilidad torácica + estiramientos generales'
      }
    ]
  },
  {
    id: 'rt-beginner',
    title: 'Imperial Start: Principiante Integral',
    targetGoal: 'Adaptación General',
    level: 'Principiante',
    daysPerWeek: 3,
    description: 'Programa de introducción al entrenamiento de fuerza. Enfocado en aprender patrones de movimiento correctos antes de subir carga.',
    trainerRationale: 'Full body 3 días por semana para maximizar la frecuencia de estímulo sin sobrecargar. Prioridad absoluta: técnica antes que peso. Cada ejercicio se aprende primero con peso corporal o carga mínima.',
    days: [
      {
        day: 'Día 1: Full Body A',
        focus: 'Patrón de Sentadilla, Empuje Horizontal, Bisagra',
        warmup: '10 min caminata en banda + movilidad articular completa',
        exercises: [
          { name: 'Sentadilla con Peso Corporal o Goblet', sets: 3, reps: '12', rest: '90s', notes: 'Aprender la técnica. Profundidad según movilidad' },
          { name: 'Press de Pecho en Máquina', sets: 3, reps: '12', rest: '75s', notes: 'Máquina para estabilidad y aprender el patrón' },
          { name: 'Peso Muerto con Mancuernas (ligero)', sets: 3, reps: '10', rest: '90s', notes: 'Aprender a hacer bisagra de cadera sin redondear espalda' },
          { name: 'Jalón al Pecho en Máquina', sets: 3, reps: '12', rest: '75s', notes: 'Sentir la espalda trabajar, no jalar con los brazos' },
          { name: 'Plancha Frontal', sets: 3, reps: '20-30 segundos', rest: '60s', notes: 'Mantener línea recta. Si es muy difícil, de rodillas' }
        ],
        cooldown: '5 min caminata + estiramientos suaves de todo el cuerpo'
      },
      {
        day: 'Día 2: Full Body B',
        focus: 'Patrón de Tracción, Empuje Vertical, Zancada',
        warmup: '10 min bicicleta + movilidad de hombro',
        exercises: [
          { name: 'Zancadas con Peso Corporal', sets: 3, reps: '10 por pierna', rest: '75s', notes: 'Equilibrio y control. Usar pared si es necesario' },
          { name: 'Press de Hombro en Máquina', sets: 3, reps: '12', rest: '75s', notes: 'No arquear la espalda. Peso liviano' },
          { name: 'Remo en Máquina Sentado', sets: 3, reps: '12', rest: '75s', notes: 'Apretar escápulas al final. Sentir la espalda' },
          { name: 'Curl de Bíceps con Mancuernas', sets: 2, reps: '12', rest: '60s', notes: 'Sin balanceo de cuerpo' },
          { name: 'Extensiones de Tríceps en Polea', sets: 2, reps: '12', rest: '60s', notes: 'Codos fijos pegados al cuerpo' },
          { name: 'Crunch Abdominal en Colchoneta', sets: 3, reps: '15', rest: '45s', notes: 'Subir hombros del piso, no el cuello' }
        ],
        cooldown: '5 min estiramientos + respiración profunda'
      },
      {
        day: 'Día 3: Full Body C',
        focus: 'Repaso de Patrones + Acondicionamiento',
        warmup: '5 min salto suave de cuerda o caminata rápida',
        exercises: [
          { name: 'Sentadilla Goblet con Mancuerna', sets: 3, reps: '12', rest: '75s', notes: 'Progresar peso solo si la técnica es limpia' },
          { name: 'Push-ups (Lagartijas) o Push-ups de Rodillas', sets: 3, reps: 'Máximas posibles', rest: '75s', notes: 'Pecho toca el piso. Versión de rodillas si es necesario' },
          { name: 'Hip Thrust con Peso Corporal', sets: 3, reps: '15', rest: '60s', notes: 'Aprender la activación de glúteo' },
          { name: 'Remo con Mancuerna Apoyado en Banco', sets: 3, reps: '10 por lado', rest: '60s', notes: 'Estabilidad del tronco. Codo al techo' },
          { name: 'Caminata en Banda o Elíptica', sets: 1, reps: '15 minutos', rest: '-', notes: 'Ritmo moderado constante para acondicionamiento' }
        ],
        cooldown: 'Estiramientos de cuerpo completo + foam roller si está disponible'
      }
    ]
  },
  {
    id: 'rt-endurance',
    title: 'Imperial Endurance: Resistencia y Acondicionamiento',
    targetGoal: 'Resistencia',
    level: 'Intermedio',
    daysPerWeek: 4,
    description: 'Programa mixto de fuerza-resistencia con circuitos, HIIT y trabajo cardiovascular progresivo.',
    trainerRationale: 'Se combina trabajo de fuerza con rep ranges altas (15-20) y circuitos metabólicos para desarrollar resistencia muscular, capacidad cardiovascular y eficiencia energética.',
    days: [
      {
        day: 'Día 1: Circuito de Fuerza-Resistencia Tren Superior',
        focus: 'Pecho, Espalda, Hombros en Formato Circuito',
        warmup: '5 min remo ergómetro + movilidad de hombro',
        exercises: [
          { name: 'Circuito (3 rondas): Press Pecho + Remo + Press Hombro + Face Pulls', sets: 3, reps: '15 cada uno', rest: '15s entre ejercicios, 120s entre rondas', notes: 'Peso moderado que permita completar las 15 con técnica' },
          { name: 'Superset: Fondos en Banco + Curl con Mancuernas', sets: 3, reps: '15 + 12', rest: '60s', notes: 'Sin descanso entre ejercicios del superset' },
          { name: 'Banda + Remo Ergómetro Intervals', sets: 1, reps: '6 rondas: 40s fuerte / 40s suave', rest: '-', notes: 'Mantener la potencia en las rondas fuertes' }
        ],
        cooldown: 'Estiramientos de tren superior 5 min'
      },
      {
        day: 'Día 2: Cardio HIIT + Core',
        focus: 'Capacidad Cardiovascular y Estabilidad Central',
        warmup: '5 min trote suave + movilidad de cadera',
        exercises: [
          { name: 'HIIT en Bicicleta Estática', sets: 1, reps: '10 rondas: 30s sprint / 60s suave', rest: '-', notes: 'Cadencia alta en sprints, resistencia al 80%' },
          { name: 'Circuito de Core (3 rondas): Plancha 30s + Plancha Lateral 20s/lado + Mountain Climbers 20s', sets: 3, reps: 'Por tiempo', rest: '60s entre rondas', notes: 'Sin descanso dentro del circuito' },
          { name: 'Caminata Inclinada en Banda', sets: 1, reps: '10 minutos', rest: '-', notes: 'Inclinación 10-12%, velocidad 5-6 km/h. Quema calórica constante' }
        ],
        cooldown: 'Estiramientos generales y respiración 5 min'
      },
      {
        day: 'Día 3: Circuito de Fuerza-Resistencia Tren Inferior',
        focus: 'Piernas en Formato Circuito de Alto Volumen',
        warmup: '5 min escaladora + activación de glúteo con banda',
        exercises: [
          { name: 'Circuito (3 rondas): Sentadilla Goblet + Zancadas + Hip Thrust + Pantorrillas', sets: 3, reps: '15 cada uno', rest: '15s entre ejercicios, 120s entre rondas', notes: 'Peso moderado. Las piernas van a arder' },
          { name: 'Superset: Prensa + Curl Femoral', sets: 3, reps: '15 + 15', rest: '60s', notes: 'Sin descanso entre ejercicios' },
          { name: 'Escaladora o StairMaster', sets: 1, reps: '10 minutos', rest: '-', notes: 'Nivel moderado-alto. No agarrarse de los barandales' }
        ],
        cooldown: 'Foam roller en piernas + estiramientos 5 min'
      },
      {
        day: 'Día 4: Full Body Metabólico',
        focus: 'Acondicionamiento Total',
        warmup: '3 min salto de cuerda + movilidad general',
        exercises: [
          { name: 'AMRAP 20 min: 10 Sentadillas + 10 Push-ups + 10 Remo invertido + 200m Remo', sets: 1, reps: 'Máx rondas en 20 min', rest: 'Libre pero mínimo', notes: 'Anotar rondas completadas para medir progreso semana a semana' },
          { name: 'Tabata Finisher: Burpees', sets: 1, reps: '8 rondas: 20s trabajo / 10s descanso', rest: '-', notes: 'Máximo esfuerzo. Solo 4 minutos pero brutales' }
        ],
        cooldown: 'Caminata 5 min + estiramientos de recuperación completos'
      }
    ]
  }
];
