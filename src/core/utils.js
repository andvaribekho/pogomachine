import * as THREE from 'three';
import { twoPi } from '../core/constants.js';

export function makeArcGeometry(innerRadius, outerRadius, startAngle, endAngle, depth) {
  const positions = [];
  const indices = [];
  const segmentCount = Math.max(8, Math.ceil(((endAngle - startAngle) / twoPi) * 80));
  const yTop = depth / 2;
  const yBottom = -depth / 2;

  function vertex(radius, angle, y) {
    const index = positions.length / 3;
    positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    return index;
  }

  function quad(a, b, c, d) {
    indices.push(a, b, c, a, c, d);
  }

  for (let i = 0; i < segmentCount; i += 1) {
    const a0 = startAngle + ((endAngle - startAngle) * i) / segmentCount;
    const a1 = startAngle + ((endAngle - startAngle) * (i + 1)) / segmentCount;

    const innerTop0 = vertex(innerRadius, a0, yTop);
    const innerTop1 = vertex(innerRadius, a1, yTop);
    const outerTop1 = vertex(outerRadius, a1, yTop);
    const outerTop0 = vertex(outerRadius, a0, yTop);
    quad(outerTop0, innerTop0, innerTop1, outerTop1);

    const outerBottom0 = vertex(outerRadius, a0, yBottom);
    const outerBottom1 = vertex(outerRadius, a1, yBottom);
    const innerBottom1 = vertex(innerRadius, a1, yBottom);
    const innerBottom0 = vertex(innerRadius, a0, yBottom);
    quad(outerBottom0, outerBottom1, innerBottom1, innerBottom0);

    const outerSide0Top = vertex(outerRadius, a0, yTop);
    const outerSide1Top = vertex(outerRadius, a1, yTop);
    const outerSide1Bottom = vertex(outerRadius, a1, yBottom);
    const outerSide0Bottom = vertex(outerRadius, a0, yBottom);
    quad(outerSide0Top, outerSide1Top, outerSide1Bottom, outerSide0Bottom);

    const innerSide0Top = vertex(innerRadius, a0, yTop);
    const innerSide0Bottom = vertex(innerRadius, a0, yBottom);
    const innerSide1Bottom = vertex(innerRadius, a1, yBottom);
    const innerSide1Top = vertex(innerRadius, a1, yTop);
    quad(innerSide0Top, innerSide0Bottom, innerSide1Bottom, innerSide1Top);
  }

  const capStartOuterTop = vertex(outerRadius, startAngle, yTop);
  const capStartInnerTop = vertex(innerRadius, startAngle, yTop);
  const capStartInnerBottom = vertex(innerRadius, startAngle, yBottom);
  const capStartOuterBottom = vertex(outerRadius, startAngle, yBottom);
  quad(capStartOuterTop, capStartInnerTop, capStartInnerBottom, capStartOuterBottom);

  const capEndOuterTop = vertex(outerRadius, endAngle, yTop);
  const capEndOuterBottom = vertex(outerRadius, endAngle, yBottom);
  const capEndInnerBottom = vertex(innerRadius, endAngle, yBottom);
  const capEndInnerTop = vertex(innerRadius, endAngle, yTop);
  quad(capEndOuterTop, capEndOuterBottom, capEndInnerBottom, capEndInnerTop);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function angleInArc(angle, start, end) {
  if (start <= end) return angle >= start && angle <= end;
  return angle >= start || angle <= end;
}

export function isBlueTile(tile) {
  return tile.type === 'blue' || tile.type === 'crackedBlue' || tile.type === 'shop';
}

export function isFlashablePlatformTile(tile) {
  return tile.type === 'blue' || tile.type === 'crackedBlue' || tile.type === 'shop' || tile.type === 'gray';
}
