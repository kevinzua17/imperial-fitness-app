import { useEffect, useState } from 'react';
import { getFoodImageOverridesFromApi, saveFoodImageOverrideToApi, uploadFoodImageToApi } from '../services/mediaService';
import { normalizeFoodKey, type FoodImageOverrides } from '../data/foodMedia';

const STORAGE_KEY = 'imperial_food_image_overrides_v1';

function loadLocal(): FoodImageOverrides {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistLocal(next: FoodImageOverrides) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is an optional cache; backend data remains authoritative.
  }
}

export function useFoodImageOverrides(syncKey: string) {
  const [foodImageOverrides, setFoodImageOverrides] = useState<FoodImageOverrides>({});
  const [foodImageDrafts, setFoodImageDrafts] = useState<Record<string, string>>({});
  const [foodImageStatus, setFoodImageStatus] = useState('');

  useEffect(() => {
    const localImages = loadLocal();
    if (Object.keys(localImages).length) setFoodImageOverrides(localImages);
    void getFoodImageOverridesFromApi()
      .then(serverImages => {
        const merged = { ...localImages, ...serverImages };
        setFoodImageOverrides(merged);
        persistLocal(merged);
      })
      .catch(() => {
        // Local Imperial images keep the plan usable if media service is unavailable.
      });
  }, [syncKey]);

  const updateOverrideState = (foodName: string, imageUrl: string) => {
    const key = normalizeFoodKey(foodName);
    setFoodImageOverrides(previous => {
      const next = { ...previous, [key]: imageUrl };
      persistLocal(next);
      return next;
    });
    setFoodImageDrafts(previous => ({ ...previous, [key]: imageUrl }));
    return key;
  };

  const handleSaveFoodImageUrl = async (foodName: string) => {
    const key = normalizeFoodKey(foodName);
    const imageUrl = (foodImageDrafts[key] || foodImageOverrides[key] || '').trim();
    if (!imageUrl) {
      setFoodImageStatus('Pega una URL https, /foods/... o /uploads/... antes de guardar.');
      return;
    }
    updateOverrideState(foodName, imageUrl);
    setFoodImageStatus(`Guardando imagen de ${foodName}…`);
    try {
      const savedUrl = await saveFoodImageOverrideToApi(key, imageUrl);
      updateOverrideState(foodName, savedUrl);
      setFoodImageStatus(`Imagen de ${foodName} guardada para la app.`);
    } catch {
      setFoodImageStatus('No se pudo guardar en backend. Quedó aplicada solo en este navegador para previsualizar.');
    }
  };

  const handleUploadFoodImage = async (foodName: string, file?: File | null) => {
    if (!file) return;
    const key = normalizeFoodKey(foodName);
    const previewUrl = URL.createObjectURL(file);
    updateOverrideState(foodName, previewUrl);
    setFoodImageStatus(`Subiendo imagen de ${foodName}…`);
    try {
      const imageUrl = await uploadFoodImageToApi(key, file);
      updateOverrideState(foodName, imageUrl);
      setFoodImageStatus(`Imagen de ${foodName} subida y asociada correctamente.`);
    } catch {
      setFoodImageStatus('No se pudo subir al backend. Puedes pegar una URL https de Cloudinary o una ruta /foods/... y guardar.');
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return {
    foodImageOverrides,
    foodImageDrafts,
    foodImageStatus,
    setFoodImageDrafts,
    setFoodImageStatus,
    handleSaveFoodImageUrl,
    handleUploadFoodImage,
  };
}
