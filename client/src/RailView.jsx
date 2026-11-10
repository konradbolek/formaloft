import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { railLayout } from "../../shared/railLayout.js";
import { shotOf } from "./captureView.js";

function steelMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.42,
    roughness: 0.46,
  });
}

function buildRail(props) {
  const layout = railLayout(props);
  const group = new THREE.Group();
  const bucket = { geometries: [], materials: [] };
  const steel = steelMaterial(props.frameColor);
  bucket.materials.push(steel);
  const plateMat = steelMaterial(props.frameColor);
  plateMat.roughness = 0.55;
  bucket.materials.push(plateMat);

  const addBox = (width, height, depth, x, y, z, material = steel) => {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    bucket.geometries.push(geometry);
  };

  for (const post of layout.posts) {
    const postHeight = post.y1 - post.y0;
    addBox(props.postWidth, postHeight, props.postDepth, post.x, post.y0 + postHeight / 2, post.z);
    if (props.mount === "czolo") {
      const plate = {
        front: [post.x, -props.slabThickness / 2, post.z + props.postDepth / 2 + 0.4, props.postWidth + 4, props.slabThickness * 0.72, 0.8],
        left: [post.x - props.postWidth / 2 - 0.4, -props.slabThickness / 2, post.z, 0.8, props.slabThickness * 0.72, props.postDepth + 4],
        right: [post.x + props.postWidth / 2 + 0.4, -props.slabThickness / 2, post.z, 0.8, props.slabThickness * 0.72, props.postDepth + 4],
      }[post.face];
      addBox(plate[3], plate[4], plate[5], plate[0], plate[1], plate[2], plateMat);
    } else {
      addBox(props.postWidth + 4, 0.8, props.postDepth + 4, post.x, 0.4, post.z, plateMat);
    }
  }

  for (const rail of layout.rails) {
    const thickness = rail.role === "handrail" ? props.handrailThickness : props.bottomThickness;
    const y =
      rail.role === "handrail" ? props.height - thickness / 2 : (props.floorGap || 0) + thickness / 2;
    if (rail.axis === "x") addBox(rail.length, thickness, rail.cross, rail.x, y, rail.z);
    else addBox(rail.cross, thickness, rail.length, rail.x, y, rail.z);
  }

  const profile = props.fill === "profil";
  const across = profile ? props.fillWidth : props.barDiameter;
  const into = profile ? props.fillDepth : props.barDiameter;
  for (const bar of layout.bars) {
    if (bar.length < 1) continue;
    if (!profile) {
      const geometry = new THREE.CylinderGeometry(across / 2, across / 2, bar.length, 10);
      const mesh = new THREE.Mesh(geometry, steel);
      if (bar.axis === "x") mesh.rotation.z = Math.PI / 2;
      if (bar.axis === "z") mesh.rotation.x = Math.PI / 2;
      mesh.position.set(bar.x, bar.y, bar.z);
      mesh.castShadow = true;
      group.add(mesh);
      bucket.geometries.push(geometry);
      continue;
    }
    const size =
      bar.axis === "x"
        ? [bar.length, across, into]
        : bar.axis === "z"
          ? [into, across, bar.length]
          : bar.run === "z"
            ? [into, bar.length, across]
            : [across, bar.length, into];
    addBox(size[0], size[1], size[2], bar.x, bar.y, bar.z);
  }

  group.userData.bucket = bucket;
  return group;
}

function disposeGroup(group) {
  const bucket = group.userData.bucket;
  if (!bucket) return;
  for (const geometry of bucket.geometries) geometry.dispose();
  for (const material of bucket.materials) material.dispose();
}

export const RailView = forwardRef(function RailView(props, ref) {
  const mountRef = useRef(null);
  const spinRef = useRef(null);
  const apiRef = useRef(null);
  const {
    length,
    height,
    postWidth,
    postDepth,
    postSpacing,
    handrailWidth,
    handrailThickness,
    bottom,
    bottomWidth,
    bottomThickness,
    floorGap,
    barDiameter,
    fill,
    fillWidth,
    fillDepth,
    barGap,
    mount,
    slabThickness,
    sides,
    sideLength,
    bars,
    frameColor,
    photoUrl,
    wallColor = "#e4d3b5",
  } = props;

  useImperativeHandle(ref, () => ({
    capture() {
      return apiRef.current?.capture() || "";
    },
  }));

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return undefined;

    const config = {
      length,
      height,
      postWidth,
      postDepth,
      postSpacing,
      handrailWidth,
      handrailThickness,
      bottom,
      bottomWidth,
      bottomThickness,
      floorGap,
      barDiameter,
      fill,
      fillWidth,
      fillDepth,
      barGap,
      mount,
      slabThickness,
      sides,
      sideLength,
      bars,
      frameColor,
    };

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#c9d4de");

    const facadeWidth = length + 180;
    const facadeBottom = -90;
    const facadeTop = height + 150;
    const facadeHeight = facadeTop - facadeBottom;
    const facadeMaterial = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 1 });
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(facadeWidth, facadeHeight), facadeMaterial);
    facade.position.set(0, (facadeTop + facadeBottom) / 2, 0);
    facade.receiveShadow = true;
    scene.add(facade);

    const doorWidth = Math.min(96, length * 0.46);
    const doorHeight = 205;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, doorHeight, 6),
      new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.7 }),
    );
    door.position.set(0, doorHeight / 2, 2);
    scene.add(door);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth * 0.72, doorHeight * 0.62, 2),
      new THREE.MeshStandardMaterial({
        color: "#9eb6c4",
        roughness: 0.18,
        metalness: 0.08,
      }),
    );
    glass.position.set(0, doorHeight * 0.58, 5.2);
    scene.add(glass);

    const slabMaterial = new THREE.MeshStandardMaterial({ color: "#c8c2b8", roughness: 0.94 });
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(length + 16, slabThickness, sideLength),
      slabMaterial,
    );
    slab.position.set(0, -slabThickness / 2, sideLength / 2);
    slab.castShadow = true;
    slab.receiveShadow = true;
    scene.add(slab);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshStandardMaterial({ color: "#8d9288", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -168, 180);
    ground.receiveShadow = true;
    scene.add(ground);

    const rail = buildRail(config);
    rail.position.set(0, 0, 0);
    scene.add(rail);

    scene.add(new THREE.HemisphereLight("#f4f7fb", "#8d9288", 0.85));
    const sun = new THREE.DirectionalLight("#fff6ea", 1.85);
    sun.position.set(length * 0.35, height + 180, sideLength + 260);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const span = Math.max(length, height) * 0.8;
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = span * 8;
    sun.shadow.bias = -0.0006;
    sun.target.position.set(0, height * 0.4, sideLength * 0.6);
    scene.add(sun);
    scene.add(sun.target);

    if (!spinRef.current) {
      spinRef.current = { yaw: 0.52, pitch: 0.14, distance: 1 };
    }
    const spin = spinRef.current;
    const target = new THREE.Vector3();
    let fitRadius = 1;
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 8000);

    const placeCamera = () => {
      spin.pitch = THREE.MathUtils.clamp(spin.pitch, -0.25, 0.72);
      spin.distance = THREE.MathUtils.clamp(spin.distance, 0.72, 1.5);
      const reach = fitRadius * spin.distance;
      const planar = Math.cos(spin.pitch) * reach;
      camera.position.set(
        target.x + Math.sin(spin.yaw) * planar,
        target.y + Math.sin(spin.pitch) * reach,
        target.z + Math.cos(spin.yaw) * planar,
      );
      camera.lookAt(target);
    };

    const frameCamera = () => {
      const aspect = host.clientWidth / Math.max(host.clientHeight, 1);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const boxH = height + slabThickness + 120;
      const boxW = Math.hypot(length, sideLength) * 1.48 + 70;
      const distH = boxH / 2 / Math.tan(fov / 2);
      const distW = boxW / 2 / Math.tan(fov / 2) / Math.max(aspect, 0.45);
      fitRadius = Math.max(distH, distW);
      target.set(0, height * 0.38, sideLength * 0.42);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      placeCamera();
      renderer.render(scene, camera);
    };

    let cancelled = false;
    let sourceTexture = null;
    if (photoUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(photoUrl, (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        sourceTexture = texture;
        texture.colorSpace = THREE.SRGBColorSpace;
        const imageAspect = texture.image.width / Math.max(texture.image.height, 1);
        const planeAspect = facadeWidth / facadeHeight;
        const map = texture;
        if (imageAspect > planeAspect) {
          const repeatX = planeAspect / imageAspect;
          map.repeat.set(repeatX, 1);
          map.offset.set((1 - repeatX) / 2, 0);
        } else {
          const repeatY = imageAspect / planeAspect;
          map.repeat.set(1, repeatY);
          map.offset.set(0, (1 - repeatY) / 2);
        }
        facadeMaterial.map = map;
        facadeMaterial.color.set("#ffffff");
        facadeMaterial.needsUpdate = true;
        renderer.render(scene, camera);
      });
    }

    const canvas = renderer.domElement;
    const pointers = new Map();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchSpan = 0;
    const pointerSpan = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture?.(event.pointerId);
      if (pointers.size >= 2) {
        dragging = false;
        pinchSpan = pointerSpan();
        canvas.classList.remove("is-turning");
        return;
      }
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.classList.add("is-turning");
    };
    const onPointerMove = (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && pinchSpan > 0) {
        const nextSpan = pointerSpan();
        spin.distance *= pinchSpan / nextSpan;
        pinchSpan = nextSpan;
        placeCamera();
        renderer.render(scene, camera);
        return;
      }
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      spin.yaw -= dx * 0.008;
      spin.pitch += dy * 0.005;
      placeCamera();
      renderer.render(scene, camera);
    };
    const endDrag = (event) => {
      pointers.delete(event.pointerId);
      pinchSpan = 0;
      dragging = false;
      canvas.classList.remove("is-turning");
    };
    const onWheel = (event) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const step = Math.max(-0.09, Math.min(0.09, event.deltaY * unit * 0.0011));
      spin.distance += step;
      placeCamera();
      renderer.render(scene, camera);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    apiRef.current = { capture: () => shotOf(renderer, scene, camera, frameCamera) };

    frameCamera();
    const observer = new ResizeObserver(frameCamera);
    observer.observe(host);

    return () => {
      cancelled = true;
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      apiRef.current = null;
      observer.disconnect();
      sourceTexture?.dispose();
      disposeGroup(rail);
      facade.geometry.dispose();
      facadeMaterial.dispose();
      door.geometry.dispose();
      door.material.dispose();
      glass.geometry.dispose();
      glass.material.dispose();
      slab.geometry.dispose();
      slabMaterial.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [
    length,
    height,
    postWidth,
    postDepth,
    postSpacing,
    handrailWidth,
    handrailThickness,
    bottom,
    bottomWidth,
    bottomThickness,
    floorGap,
    barDiameter,
    fill,
    fillWidth,
    fillDepth,
    barGap,
    mount,
    slabThickness,
    sides,
    sideLength,
    bars,
    frameColor,
    photoUrl,
    wallColor,
  ]);

  return <div ref={mountRef} className="shelf-view" />;
});
