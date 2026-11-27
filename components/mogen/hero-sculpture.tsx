"use client";

import { motion, useScroll, useTransform, type MotionStyle, type MotionValue } from "framer-motion";
import styles from "./hero-sculpture.module.css";

export default function HeroSculpture() {
  const { scrollY } = useScroll();
  const spread = useTransform(scrollY, [0, 360], [0, 1]);
  const stackStyle: MotionStyle & { "--pane-spread": MotionValue<number> } = {
    "--pane-spread": spread,
  };

  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.field} />
      <div className={styles.rig}>
        <motion.div className={styles.stack} style={stackStyle}>
          <div className={`${styles.pane} ${styles.foundation}`}>
            <div className={styles.blueprint} />
          </div>
          <div className={`${styles.pane} ${styles.structure}`}>
            <div className={styles.toolbar}><i /><i /><i /></div>
            <div className={styles.wireframe}><i /><i /><i /><i /></div>
          </div>
          <div className={`${styles.pane} ${styles.interface}`}>
            <div className={styles.toolbar}><i /><i /><i /></div>
            <div className={styles.composition}>
              <div className={styles.copy}><i /><i /><i /><i /></div>
              <div className={styles.graphic}><div /><div /><div /></div>
              <div className={styles.tiles}><i /><i /><i /></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
