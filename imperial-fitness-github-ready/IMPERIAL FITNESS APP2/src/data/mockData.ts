/**
 * @deprecated Compatibilidad temporal. Los tipos de dominio viven en ../types/domain.
 * Los imports históricos siguen funcionando para no forzar una migración masiva
 * de componentes en la misma entrega.
 */
export * from '../types/domain';
export { FOOD_DATABASE, ROUTINE_TEMPLATES } from './foodDatabase';
export type { FoodItem, RoutineTemplate } from './foodDatabase';
