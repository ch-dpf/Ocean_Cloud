import { useState } from 'react'
import type { FormEvent } from 'react'
import { brandLogoUrl } from '@ocean-cloud/ui'
import styles from './LoginPage.module.css'
import {
  login,
  navigateAfterLogin,
} from '../../features/auth/services/authService'
import checkIcon from './assets/check.svg'
import userIcon from './assets/user.svg'
import lockIcon from './assets/lock.svg'
import eyeIcon from './assets/eye.svg'

const FEATURES = [
  '多源海洋数据一体化处理与可视化',
  '高精度GIS空间分析与坐标转换',
  '云端协同工作，数据实时共享',
] as const

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // TODO: 表单校验、错误提示与加载态由你完善
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    login({ username, password })
    navigateAfterLogin()
  }

  return (
    <section className={styles.loginContainer}>
      {/* 左侧品牌展示区 */}
      <div className={styles.loginLeft}>
        <div className={styles.logoSection}>
          <img className={styles.logoIcon} src={brandLogoUrl} alt="云海" />
          <span className={styles.logoText}>云海</span>
        </div>

        <div className={styles.brandContent}>
          <h1 className={styles.brandTitle}>
            地理数据
            <br />
            尽在云海
          </h1>
          <p className={styles.brandSubtitle}>
            专业的GIS空间分析与海洋数据处理平台，为科研、海事、环保等领域提供一站式数据解决方案
          </p>

          <ul className={styles.featureList}>
            {FEATURES.map((feature) => (
              <li key={feature} className={styles.featureItem}>
                <img className={styles.featureIcon} src={checkIcon} alt="" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.footerCopyright}>
          © 2026 云海 SeaCloud GIS Platform. All rights reserved.
        </div>
      </div>

      {/* 右侧登录表单区 */}
      <div className={styles.loginRight}>
        <div className={styles.formWrapper}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>欢迎登录云海</h2>
            <p className={styles.formSubtitle}>
              地理信息与海洋数据协同处理平台
            </p>
          </div>

          <form className={styles.formBody} onSubmit={handleSubmit}>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>账号</label>
              <div className={styles.inputWrapper}>
                <img className={styles.inputIcon} src={userIcon} alt="" />
                <input
                  className={styles.formInput}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号/邮箱"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>密码</label>
              <div className={styles.inputWrapper}>
                <img className={styles.inputIcon} src={lockIcon} alt="" />
                <input
                  className={styles.formInput}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
                <img
                  className={styles.inputSuffix}
                  src={eyeIcon}
                  alt={showPassword ? '隐藏密码' : '显示密码'}
                  role="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                />
              </div>
            </div>

            <div className={styles.formOptions}>
              <label className={styles.rememberMe}>
                <input type="checkbox" />
                记住我
              </label>
              {/* TODO: 忘记密码流程待接入 */}
              <a className={styles.forgotLink}>忘记密码？</a>
            </div>

            <button className={styles.loginBtn} type="submit">
              登 录
            </button>
          </form>

          <div className={styles.formFooter}>
            还没有账号？
            {/* TODO: 注册流程待接入 */}
            <a className={styles.registerLink}>立即注册</a>
          </div>
        </div>
      </div>
    </section>
  )
}
