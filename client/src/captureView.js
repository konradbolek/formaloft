export function shotOf(renderer, scene, camera, restore) {
  const canvas = renderer.domElement;
  const sourceWidth = canvas.width || 1;
  const sourceHeight = canvas.height || 1;
  const previousRatio = renderer.getPixelRatio();
  const shotWidth = 1280;
  const shotHeight = Math.max(1, Math.round((shotWidth * sourceHeight) / sourceWidth));
  renderer.setPixelRatio(1);
  renderer.setSize(shotWidth, shotHeight, false);
  camera.aspect = shotWidth / shotHeight;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = canvas.toDataURL("image/jpeg", 0.9);
  renderer.setPixelRatio(previousRatio);
  restore();
  return url.startsWith("data:image/") ? url : "";
}
