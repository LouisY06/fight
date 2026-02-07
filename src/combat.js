import * as THREE from 'three';

const enemyMat = new THREE.MeshStandardMaterial({
  color: 0xff3300,
  emissive: 0xff2200,
  emissiveIntensity: 0.5,
  metalness: 0.4,
  roughness: 0.6,
});

const explosionMat = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 1.0,
});

const raycaster = new THREE.Raycaster();

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.particles = [];
    this.kills = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 3; // seconds between spawns
    this.maxEnemies = 5;
  }

  spawnEnemy() {
    if (this.enemies.length >= this.maxEnemies) return;

    const geo = new THREE.OctahedronGeometry(0.4, 1);
    const mesh = new THREE.Mesh(geo, enemyMat.clone());

    // Spawn in front of the mecha at random positions
    mesh.position.set(
      (Math.random() - 0.5) * 8,
      1 + Math.random() * 3,
      -3 - Math.random() * 8
    );

    mesh.userData = {
      health: 40,
      maxHealth: 40,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.5 + Math.random() * 1.5,
    };

    this.scene.add(mesh);
    this.enemies.push(mesh);
  }

  /**
   * Fire weapon — raycast from origin in direction.
   * Returns hit info or null.
   */
  fireWeapon(origin, direction, weapon) {
    if (!origin || !direction) return null;

    raycaster.set(origin, direction);
    raycaster.far = 100;

    const intersects = raycaster.intersectObjects(
      this.enemies.map((e) => e),
      false
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const enemy = hit.object;
      const damage = weapon === 'gun' ? 20 : weapon === 'sword' ? 30 : 10;
      enemy.userData.health -= damage;

      // Flash enemy white on hit
      enemy.material.emissive.set(0xffffff);
      enemy.material.emissiveIntensity = 2.0;
      setTimeout(() => {
        if (enemy.material) {
          enemy.material.emissive.set(0xff2200);
          enemy.material.emissiveIntensity = 0.5;
        }
      }, 100);

      if (enemy.userData.health <= 0) {
        this.destroyEnemy(enemy);
        this.kills++;
      }

      return { point: hit.point, enemy };
    }
    return null;
  }

  destroyEnemy(enemy) {
    // Spawn explosion particles
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 4);
      const particle = new THREE.Mesh(geo, explosionMat.clone());
      particle.position.copy(enemy.position);
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3,
          (Math.random() - 0.5) * 4
        ),
        life: 1.0,
      };
      this.scene.add(particle);
      this.particles.push(particle);
    }

    // Remove enemy
    this.scene.remove(enemy);
    enemy.geometry.dispose();
    enemy.material.dispose();
    this.enemies = this.enemies.filter((e) => e !== enemy);
  }

  update(dt) {
    // Spawn timer
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // Animate enemies — bob up and down, rotate
    const time = performance.now() / 1000;
    for (const enemy of this.enemies) {
      const ud = enemy.userData;
      enemy.position.y += Math.sin(time * ud.bobSpeed + ud.bobPhase) * 0.003;
      enemy.rotation.y += dt * 0.8;
      enemy.rotation.x += dt * 0.3;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const ud = p.userData;
      ud.life -= dt * 2;
      if (ud.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.position.add(ud.velocity.clone().multiplyScalar(dt));
      ud.velocity.y -= 5 * dt; // gravity
      p.material.opacity = ud.life;
      p.scale.setScalar(ud.life);
    }
  }
}
