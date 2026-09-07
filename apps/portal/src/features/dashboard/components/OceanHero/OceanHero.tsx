import styles from './OceanHero.module.css'
export function OceanHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.heroTag}>OCEAN CLOUD · 云海平台</span>
        <h2>
          汇聚海洋数据
          <br />
          开启无限可能<span>。</span>
        </h2>
        <p>
          一个入口，连接数据、应用与协作。
          <br />
          让每一份海洋数据，创造更大的价值。
        </p>
        <a className={styles.whiteButton} href="#/applications">
          进入应用中心 <span>↗</span>
        </a>
      </div>
      <div className={styles.oceanArt} aria-hidden="true">
        <div className={[styles.orbit, styles.orbitOne].join(' ')} />
        <div className={[styles.orbit, styles.orbitTwo].join(' ')} />
        <div className={[styles.orbit, styles.orbitThree].join(' ')} />
        <img src="/ocean-logo.png" alt="" />
        <span className={styles.coordinate}>35° 06′ N &nbsp; 120° 18′ E</span>
      </div>
      <span className={styles.heroBottom}>EXPLORE. CONNECT. CREATE.</span>
    </section>
  )
}
