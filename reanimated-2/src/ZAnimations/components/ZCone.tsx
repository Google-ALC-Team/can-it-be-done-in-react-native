import React from "react";
import { processColor, StyleSheet } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import {
  identityMatrix4,
  processTransform3d,
  serialize,
  toDeg,
} from "react-native-redash";
import { Circle, Ellipse, Line, Path } from "react-native-svg";

import Layer from "./Layer";
import { addArc3, createPath3 } from "./Path3";
import { project, rotateZ } from "./Vector";
import Vertex from "./Vertex";
import Points from "./ZPoints";
import { useZSvg } from "./ZSvg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface ZConeProps {
  r: number;
  length: number;
  base: string;
  body: string;
}

const ZCone = ({ r, length, base: baseColor, body: bodyColor }: ZConeProps) => {
  const c1 = processColor(baseColor);
  const c2 = processColor(bodyColor);
  const { camera, canvas } = useZSvg();
  const path = createPath3({ x: -r, y: 0, z: 0 });
  addArc3(path, { x: -r, y: r, z: 0 }, { x: 0, y: r, z: 0 });
  addArc3(path, { x: r, y: r, z: 0 }, { x: r, y: 0, z: 0 });
  addArc3(path, { x: r, y: -r, z: 0 }, { x: 0, y: -r, z: 0 });
  addArc3(path, { x: -r, y: -r, z: 0 }, { x: -r, y: 0, z: 0 });

  const data = useDerivedValue(() => {
    const m = processTransform3d([
      { rotateX: camera.y.value },
      { rotateY: camera.x.value },
    ]);
    const apex3d = project({ x: 0, y: 0, z: -length }, canvas, m);
    const apex = { x: 0, y: Math.sqrt(apex3d.x ** 2 + apex3d.y ** 2), z: 0 };
    const rz = -Math.PI / 2 + Math.atan2(apex3d.y, apex3d.x);

    const bPath = {
      move: project(path.move, canvas, m),
      curves: path.curves.map((curve) => ({
        c1: project(curve.c1, canvas, m),
        c2: project(curve.c2, canvas, m),
        to: project(curve.to, canvas, m),
      })),
      close: path.close,
    };

    //const n = project({ x: 0, y: length, z: 0 }, canvas, m);
    //const eccenAngle = Math.acos(nDist / scale);
    // const e = Math.abs(Math.sin(Math.atan2(n.y, n.z)));
    // console.log(e);
    const y0 = Math.sqrt(apex.x ** 2 + apex.y ** 2);
    const a = (r * canvas.x) / 2;
    // const L = (length * canvas.x) / 2;
    const pr1 = {
      move: project(path.move, canvas, m),
      curves: [
        {
          c1: project(path.curves[0].c1, canvas, m),
          c2: project(path.curves[0].c2, canvas, m),
          to: project(path.curves[0].to, canvas, m),
        },
      ],
      close: false,
    };
    const pr2 = {
      move: project(path.curves[0].to, canvas, m),
      curves: [
        {
          c1: project(path.curves[1].c1, canvas, m),
          c2: project(path.curves[1].c2, canvas, m),
          to: project(path.curves[1].to, canvas, m),
        },
      ],
      close: false,
    };
    const pr3 = {
      move: project(path.curves[1].to, canvas, m),
      curves: [
        {
          c1: project(path.curves[2].c1, canvas, m),
          c2: project(path.curves[2].c2, canvas, m),
          to: project(path.curves[2].to, canvas, m),
        },
      ],
      close: false,
    };
    const pr4 = {
      move: project(path.curves[2].to, canvas, m),
      curves: [
        {
          c1: project(path.curves[3].c1, canvas, m),
          c2: project(path.curves[3].c2, canvas, m),
          to: project(path.curves[3].to, canvas, m),
        },
      ],
      close: false,
    };
    const n = project({ x: 0, y: r, z: 0 }, canvas, m);
    const s = project({ x: 0, y: r, z: 0 }, canvas, identityMatrix4);
    const b = Math.sqrt(n.x ** 2 + n.y ** 2); //;
    const b2 = Math.sqrt(s.x ** 2 + s.y ** 2); //;

    console.log(JSON.stringify({ a, b, b2 }, null, 2));
    const y = b ** 2 / y0;
    const x = a * Math.sqrt(1 - y ** 2 / b ** 2);
    if (y0 < b) {
      console.log("Invisible");
      return {
        d: serialize(bPath),
        apex: apex3d,
        points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, apex3d],
        n,
        pr1,
        pr2,
        pr3,
        pr4,
      };
    }
    const p1 = rotateZ(
      {
        x: x,
        y: Math.sign(y0) * y,
        z: 0,
      },
      rz
    );
    const p2 = rotateZ(
      {
        x: -x,
        y: Math.sign(y0) * y,
        z: 0,
      },
      rz
    );
    return {
      d: serialize(bPath),
      apex: apex3d,
      points: [p1, p2, apex3d],
      n,
      pr1,
      pr2,
      pr3,
      pr4,
    };
  });
  const points = useDerivedValue(() => data.value.points);
  const face = useAnimatedProps(() => ({
    d: data.value.d,
    fill: data.value.apex.z < 0 ? c1 : c2,
    //stroke: data.value.apex.z < 0 ? c1 : c2,
    //strokeWidth: 4,
    //fillOpacity: 0.5,
  }));
  const animatedProps = useAnimatedProps(() => ({
    cx: data.value.n.x,
    cy: data.value.n.y,
  }));
  const pr1 = useAnimatedProps(() => ({
    d: serialize(data.value.pr1),
    fill: "red",
  }));
  const pr2 = useAnimatedProps(() => ({
    d: serialize(data.value.pr2),
    fill: "green",
  }));
  const pr3 = useAnimatedProps(() => ({
    d: serialize(data.value.pr3),
    fill: "blue",
  }));
  const pr4 = useAnimatedProps(() => ({
    d: serialize(data.value.pr4),
    fill: "yellow",
  }));
  return (
    <>
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedPath animatedProps={face} />
      </Layer>
      <Vertex points={points} fill={bodyColor} />
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedCircle r={5} fill="blue" animatedProps={animatedProps} />
      </Layer>
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedPath animatedProps={pr1} />
      </Layer>
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedPath animatedProps={pr2} />
      </Layer>
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedPath animatedProps={pr3} />
      </Layer>
      <Layer zIndexStyle={{ zIndex: 0 }}>
        <AnimatedPath animatedProps={pr4} />
      </Layer>
    </>
  );
};
export default ZCone;