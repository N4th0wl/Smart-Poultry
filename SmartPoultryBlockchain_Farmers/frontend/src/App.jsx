import { useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Link } from 'react-router-dom'
import { Autoplay, Navigation, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'
import './App.css'
import bannerAyam1 from './assets/bannerayam1.jpg'
import bannerAyam2 from './assets/bannerayam2.jpg'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactNeed, setContactNeed] = useState('')

  const handleLogoClick = (event) => {
    event.preventDefault()
    document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const handleContactSubmit = (event) => {
    event.preventDefault()
    const trimmedName = contactName.trim()
    const trimmedNeed = contactNeed.trim()
    const message = `Halo nama saya '${trimmedName || '...'}' saya ingin konsultasi dengan tim SmartPoultry untuk kebutuhan atau pertanyaan yaitu '${trimmedNeed || '...'}'. Terima Kasih.`
    const url = `https://wa.me/6287715658420?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="page">
      <nav className="topbar">
        <a href="#home" className="brand brand-link" onClick={handleLogoClick}>
          <p className="brand-name">SmartPoultry</p>
        </a>
        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => setIsMenuOpen(false)}>
            <span className="nav-link-text">Home</span>
            <span className="nav-link-arrow" aria-hidden="true">↗</span>
          </a>
          <a href="#about" onClick={() => setIsMenuOpen(false)}>
            <span className="nav-link-text">About Us</span>
            <span className="nav-link-arrow" aria-hidden="true">↗</span>
          </a>
          <a href="#services" onClick={() => setIsMenuOpen(false)}>
            <span className="nav-link-text">Our Service</span>
            <span className="nav-link-arrow" aria-hidden="true">↗</span>
          </a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>
            <span className="nav-link-text">Contact</span>
            <span className="nav-link-arrow" aria-hidden="true">↗</span>
          </a>
          <Link className="btn btn-primary topbar-btn mobile-only" to="/register" onClick={() => setIsMenuOpen(false)}>
            Masuk / Daftar
          </Link>
        </div>
        <Link className="btn btn-primary topbar-btn desktop-only" to="/register">
          Masuk / Daftar
        </Link>
        <button
          className={`hamburger ${isMenuOpen ? 'is-active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="hamburger-box">
            <span className="hamburger-inner"></span>
          </span>
        </button>
      </nav>
      <header id="home" className="hero">
        <div className="hero-content">
          <h1>
            SmartPoultry membantu Peternakan Unggas Bekerja Lebih Cepat, Efisien, Stabil, & Terukur.
          </h1>
          <p className="hero-subtitle">
            Monitoring, kontrol pangan, analitik, dan pelacakan berbasis Blockchain untuk meningkatkan kualitas
            ternak serta efisiensi kegiatan operasional.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#services">
              Lihat Layanan
            </a>
            <a className="btn btn-ghost" href="#services">
              Pelajari Lebih Lanjut
            </a>
          </div>
          <div className="hero-stats">
            <Swiper
              modules={[Autoplay, Navigation, EffectFade]}
              effect="fade"
              fadeEffect={{
                crossFade: true
              }}
              spaceBetween={0}
              slidesPerView={1}
              centeredSlides={false}
              loop={true}
              autoplay={{
                delay: 2000,
                disableOnInteraction: false,
              }}
              navigation={{
                nextEl: '.swiper-button-next-custom',
                prevEl: '.swiper-button-prev-custom',
              }}
              className="stats-carousel"
            >
              <SwiperSlide>
                <div className="stat-card">
                  <p className="stat-label">Stabilitas</p>
                  <p className="stat-value">↑ 80%</p>
                  <p className="stat-caption">Rasio kandang sehat dan siap panen</p>
                </div>
              </SwiperSlide>
              <SwiperSlide>
                <div className="stat-card">
                  <p className="stat-label">Monitoring</p>
                  <p className="stat-value">24/7</p>
                  <p className="stat-caption">Monitoring data yang kredibel & profesional</p>
                </div>
              </SwiperSlide>
              <SwiperSlide>
                <div className="stat-card">
                  <p className="stat-label">Efisiensi biaya</p>
                  <p className="stat-value">↓ 35%</p>
                  <p className="stat-caption">Penggunaan pakan & energi lebih hemat</p>
                </div>
              </SwiperSlide>
            </Swiper>
            <div className="carousel-nav">
              <button className="swiper-button-prev-custom" aria-label="Previous slide">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button className="swiper-button-next-custom" aria-label="Next slide">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-images">
            <img src={bannerAyam1} alt="Banner Ayam 1" className="hero-banner-1" />
            <img src={bannerAyam2} alt="Banner Ayam 2" className="hero-banner-2" />
          </div>
        </div>
      </header>

      <main>
        <section id="about" className="section about">
          <div className="section-heading">
            <span>About Us</span>
            <h2>Partner strategis untuk peternakan modern.</h2>
            <p>
              Kami menggabungkan sensor presisi, analitik data, dan otomatisasi
              operasional untuk memastikan kualitas ternak tetap optimal dan
              risiko produksi turun secara konsisten.
            </p>
          </div>
          <div className="about-grid">
            <div className="about-card">
              <h3>Operasi Terpadu</h3>
              <p>
                Semua kandang, gudang pakan, hingga distribusi terhubung dalam
                satu sistem pemantauan.
              </p>
            </div>
            <div className="about-card">
              <h3>Keputusan Berbasis Data</h3>
              <p>
                Data produksi dianalisis harian untuk menentukan strategi
                pemberian pakan, suhu, dan biosecurity.
              </p>
            </div>
            <div className="about-card highlight">
              <h3>Tim Pendamping Lapangan</h3>
              <p>
                Konsultan teknis kami membantu SOP, pelatihan operator, hingga
                audit performa mingguan.
              </p>
            </div>
          </div>
        </section>

        <section id="services" className="section services">
          <div className="section-heading">
            <span>Our Service</span>
            <h2>Layanan end-to-end untuk efisiensi peternakan.</h2>
          </div>
          <div className="service-grid">
            <article className="service-card">
              <h3>Monitoring Kandang</h3>
              <p>Sensor suhu, kelembapan, dan kualitas udara terhubung real-time.</p>
              <ul>
                <li>Alert otomatis</li>
                <li>Grafik historis 24/7</li>
                <li>Integrasi perangkat IoT</li>
              </ul>
            </article>
            <article className="service-card">
              <h3>Manajemen Pakan</h3>
              <p>Rencana pakan adaptif untuk meningkatkan FCR dan kualitas hasil.</p>
              <ul>
                <li>Rekomendasi nutrisi</li>
                <li>Kontrol stok pakan</li>
                <li>Optimasi biaya</li>
              </ul>
            </article>
            <article className="service-card">
              <h3>Analitik Produksi</h3>
              <p>Dashboard KPI, prediksi output, dan laporan kinerja periodik.</p>
              <ul>
                <li>Prediksi panen</li>
                <li>Laporan harian otomatis</li>
                <li>Integrasi keuangan</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="contact" className="section contact">
          <div className="contact-card">
            <div>
              <span>Contact</span>
              <h2>Bangun peternakan yang lebih cerdas hari ini.</h2>
              <p>
                Tim SmartPoultry siap membantu Anda mulai dari assessment hingga
                implementasi sistem.
              </p>
              <div className="contact-info">
                <div>
                  <strong>Alamat</strong>
                  <p>Jl. Agro Tekno No. 12, Bandung</p>
                </div>
                <div>
                  <strong>Email</strong>
                  <p>hello@smartpoultry.id</p>
                </div>
                <div>
                  <strong>Telepon</strong>
                  <p>+62 812 3456 7890</p>
                </div>
              </div>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <label>
                Nama
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  required
                />
              </label>
              <label>
                Kebutuhan Anda
                <textarea
                  rows="4"
                  placeholder="Ceritakan kebutuhan peternakan Anda"
                  value={contactNeed}
                  onChange={(event) => setContactNeed(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Kirim Permintaan
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <h3>SmartPoultry</h3>
            <p>Platform Smart Farming Terintegrasi untuk peternakan unggas yang lebih efisien dan terukur.</p>
          </div>
          <div className="footer-contact">
            <h4>Kontak Kami</h4>
            <p>Jl. Agro Tekno No. 12, Bandung</p>
            <p>hello@smartpoultry.id</p>
            <p>+62 812 3456 7890</p>
          </div>
          <div className="footer-nav">
            <h4>Navigasi</h4>
            <a href="#home">Home</a>
            <a href="#about">About Us</a>
            <a href="#services">Our Service</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 SmartPoultry. Semua hak dilindungi.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
