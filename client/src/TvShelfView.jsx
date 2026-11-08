import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { shotOf } from "./captureView.js";

function plankTexture(color, edge) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 16; i += 1) {
    const y = ((i + 0.35) / 16) * canvas.height;
    ctx.strokeStyle = edge;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = i % 4 === 0 ? 3 : 1.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(140, y + 8, 320, y - 10, canvas.width, y + 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i % 2 ? edge : "#f4efe6";
    ctx.fillRect((i / 5) * canvas.width, 0, canvas.width / 5 - 3, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function floorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c6a57a";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = i % 2 ? "#b89368" : "#d2b48a";
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, (i / 7) * 256, 256, 256 / 7 - 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function addBox(group, bucket, size, material, x, y, z) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  bucket.geometries.add(geometry);
}

function buildConsole({
  height,
  width,
  depth,
  frame,
  board,
  shelves,
  bays,
  legs,
  woodColor,
  woodEdge,
  frameColor,
}) {
  const group = new THREE.Group();
  const bucket = { geometries: new Set(), materials: new Set() };
  const postH = Math.max(height - board, frame * 2 + 6);
  const leg = Math.min(Math.max(legs || 0, 0), Math.max(postH - board - 4, 0));
  const levels = [];
  for (let i = 0; i < shelves; i += 1) {
    levels.push(i === shelves - 1 ? postH : leg + (i * (postH - leg)) / (shelves - 1));
  }

  const metal = new THREE.MeshStandardMaterial({
    color: frameColor || "#1a1a1a",
    metalness: 0.22,
    roughness: 0.58,
  });
  const map = plankTexture(woodColor, woodEdge);
  map.repeat.set(Math.max(width / 70, 1), Math.max(depth / 40, 1));
  const woodTop = new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.02 });
  const woodSide = new THREE.MeshStandardMaterial({ color: woodEdge, roughness: 0.72 });
  const boardMaterials = [woodSide, woodSide, woodTop, woodSide, woodSide, woodSide];
  bucket.materials.add(metal);
  bucket.materials.add(woodTop);
  bucket.materials.add(woodSide);

  const lines = bays + 1;
  for (let i = 0; i < lines; i += 1) {
    const x = frame / 2 + (i * (width - frame)) / (lines - 1);
    for (const z of [frame / 2, depth - frame / 2]) {
      addBox(group, bucket, [frame, postH, frame], metal, x, postH / 2, z);
    }
  }

  for (const y of levels) {
    const railY = Math.max(frame / 2, y - frame / 2);
    addBox(group, bucket, [Math.max(width - frame * 2, frame), frame, frame], metal, width / 2, railY, frame / 2);
    addBox(
      group,
      bucket,
      [Math.max(width - frame * 2, frame), frame, frame],
      metal,
      width / 2,
      railY,
      depth - frame / 2,
    );
    for (let i = 0; i < lines; i += 1) {
      const x = frame / 2 + (i * (width - frame)) / (lines - 1);
      addBox(
        group,
        bucket,
        [frame, frame, Math.max(depth - frame * 2, frame)],
        metal,
        x,
        railY,
        depth / 2,
      );
    }

    const top = y === postH;
    const boardW = top ? width + 2 : Math.max(width - frame * 0.4, frame);
    const boardD = top ? depth + 1 : Math.max(depth - frame * 1.2, frame);
    addBox(group, bucket, [boardW, board, boardD], boardMaterials, width / 2, y + board / 2, depth / 2);
  }

  group.position.set(-width / 2, 0, -depth / 2);
  group.userData.bucket = bucket;
  return group;
}

function disposeGroup(group) {
  const bucket = group.userData.bucket;
  if (!bucket) return;
  for (const geometry of bucket.geometries) geometry.dispose();
  for (const material of bucket.materials) {
    if (material.map) material.map.dispose();
    material.dispose();
  }
}

export const TvShelfView = forwardRef(function TvShelfView({
  height,
  width,
  depth,
  frame,
  board,
  shelves,
  bays,
  legs,
  woodColor,
  woodEdge,
  frameColor,
  photoUrl,
  wallColor = "#eadccb",
}, ref) {
  const mountRef = useRef(null);
  const spinRef = useRef(null);
  const apiRef = useRef(null);

  useImperativeHandle(ref, () => ({
    capture() {
      return apiRef.current?.capture() || "";
    },
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
    const consoleMesh = buildConsole({
      height,
      width,
      depth,
      frame,
      board,
      shelves,
      bays,
      legs,
      woodColor,
      woodEdge,
      frameColor,
    });
    scene.add(consoleMesh);
    scene.background = new THREE.Color(wallColor);

    const floorSize = 4800;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.05;
    floor.receiveShadow = true;
    scene.add(floor);

    const room = [];
    const ceilingY = Math.max(height + 36, 96);
    const backZ = -Math.max(depth, 40) - 36;
    const roomHalf = Math.max(220, width / 2 + 80);
    const frontZ = 80;
    const sideLength = frontZ - backZ;
    const midZ = (frontZ + backZ) / 2;
    const walls = [];
    const makeWallMaterial = () =>
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 1, side: THREE.DoubleSide });
    const addWall = (mesh, material, planeWidth, planeHeight) => {
      mesh.receiveShadow = true;
      scene.add(mesh);
      room.push(mesh);
      walls.push({ material, width: planeWidth, height: planeHeight });
    };
    const backMaterial = makeWallMaterial();
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomHalf * 2, ceilingY), backMaterial);
    backWall.position.set(0, ceilingY / 2, backZ);
    addWall(backWall, backMaterial, roomHalf * 2, ceilingY);
    for (const side of [-1, 1]) {
      const sideMaterial = makeWallMaterial();
      const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(sideLength, ceilingY), sideMaterial);
      sideWall.rotation.y = side * -Math.PI / 2;
      sideWall.position.set(side * roomHalf, ceilingY / 2, midZ);
      addWall(sideWall, sideMaterial, sideLength, ceilingY);
    }

    const boards = floorTexture();
    boards.repeat.set(floorSize / 140, floorSize / 140);
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({ map: boards, roughness: 0.86 }),
    );
    deck.rotation.x = -Math.PI / 2;
    deck.receiveShadow = true;
    scene.add(deck);
    room.push(deck);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomHalf * 2, sideLength),
      new THREE.MeshStandardMaterial({ color: "#f6f1e7", roughness: 1, side: THREE.DoubleSide }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, ceilingY, midZ);
    scene.add(ceiling);
    room.push(ceiling);

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
        for (const entry of walls) {
          const map = texture.clone();
          map.colorSpace = THREE.SRGBColorSpace;
          map.wrapS = THREE.ClampToEdgeWrapping;
          map.wrapT = THREE.ClampToEdgeWrapping;
          const planeAspect = entry.width / entry.height;
          if (imageAspect > planeAspect) {
            const repeatX = planeAspect / imageAspect;
            map.repeat.set(repeatX, 1);
            map.offset.set((1 - repeatX) / 2, 0);
          } else {
            const repeatY = imageAspect / planeAspect;
            map.repeat.set(1, repeatY);
            map.offset.set(0, (1 - repeatY) / 2);
          }
          entry.material.map = map;
          entry.material.color.set("#ffffff");
          entry.material.needsUpdate = true;
        }
        renderer.render(scene, camera);
      });
    }

    scene.add(new THREE.HemisphereLight("#fff4e4", "#b89a78", 0.72));
    const sun = new THREE.DirectionalLight("#fff7ee", 2.05);
    sun.position.set(width * 0.35, height * 3.2, depth * 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const shadowSpan = Math.max(height, width, depth);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = shadowSpan * 6;
    sun.shadow.camera.left = -shadowSpan;
    sun.shadow.camera.right = shadowSpan;
    sun.shadow.camera.top = shadowSpan;
    sun.shadow.camera.bottom = -shadowSpan;
    sun.shadow.bias = -0.0004;
    sun.target.position.set(0, height * 0.4, 0);
    scene.add(sun);
    scene.add(sun.target);
    const fill = new THREE.DirectionalLight("#d9e4ff", 0.4);
    fill.position.set(-width * 0.4, height, depth);
    scene.add(fill);

    if (!spinRef.current) {
      const direction = new THREE.Vector3(0.42, 0.24, 1).normalize();
      spinRef.current = {
        yaw: Math.atan2(direction.x, direction.z),
        pitch: Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)),
      };
    }
    const spin = spinRef.current;
    if (spin.distance == null) spin.distance = 1;
    const target = new THREE.Vector3();
    let fitRadius = 1;
    const nearest = 0.74;
    const farthest = 1.36;
    const wallGap = 18;

    const cameraPose = (yaw, pitch, distance) => {
      const reach = fitRadius * distance;
      const planar = Math.cos(pitch) * reach;
      return {
        x: Math.sin(yaw) * planar,
        y: target.y + Math.sin(pitch) * reach,
        z: Math.cos(yaw) * planar,
      };
    };
    const insideWalls = (pose) =>
      pose.x >= -roomHalf + wallGap &&
      pose.x <= roomHalf - wallGap &&
      pose.z >= backZ + wallGap &&
      pose.y >= 16 &&
      pose.y <= ceilingY + 4;

    const placeCamera = () => {
      spin.pitch = THREE.MathUtils.clamp(spin.pitch, -0.15, 1.05);
      spin.distance = THREE.MathUtils.clamp(spin.distance, nearest, farthest);
      if (!insideWalls(cameraPose(spin.yaw, spin.pitch, spin.distance))) {
        const yaw = spin.yaw;
        const pitch = spin.pitch;
        let low = 0;
        let high = 1;
        for (let step = 0; step < 14; step += 1) {
          const blend = (low + high) / 2;
          const tryYaw = yaw * blend;
          const tryPitch = pitch * blend + 0.22 * (1 - blend);
          if (insideWalls(cameraPose(tryYaw, tryPitch, spin.distance))) low = blend;
          else high = blend;
        }
        spin.yaw = yaw * low;
        spin.pitch = pitch * low + 0.22 * (1 - low);
        if (!insideWalls(cameraPose(spin.yaw, spin.pitch, spin.distance))) {
          let near = nearest;
          let far = spin.distance;
          for (let step = 0; step < 12; step += 1) {
            const mid = (near + far) / 2;
            if (insideWalls(cameraPose(spin.yaw, spin.pitch, mid))) near = mid;
            else far = mid;
          }
          spin.distance = near;
        }
      }
      const pose = cameraPose(spin.yaw, spin.pitch, spin.distance);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(target);
    };

    const frameCamera = () => {
      const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const boxH = Math.max(height * 2.4, 110);
      const boxW = width * 1.08 + depth * 0.4;
      const distH = boxH / 2 / Math.tan(fov / 2);
      const distW = boxW / 2 / Math.tan(fov / 2) / Math.max(aspect, 0.4);
      fitRadius = Math.max(distH, distW);
      target.set(0, height * 0.42, 0);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      placeCamera();
      renderer.render(scene, camera);
    };

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
    observer.observe(mount);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      cancelled = true;
      apiRef.current = null;
      sourceTexture?.dispose();
      observer.disconnect();
      disposeGroup(consoleMesh);
      floor.geometry.dispose();
      floor.material.dispose();
      for (const mesh of room) {
        mesh.geometry.dispose();
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [height, width, depth, frame, board, shelves, bays, legs, woodColor, woodEdge, frameColor, photoUrl, wallColor]);

  return <div ref={mountRef} className="shelf-view" />;
});
