'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminLoginModal from './AdminLoginModal';
import { useLanguage } from '@/lib/i18n';

interface HeaderProps {
  siteName?: string;
  logoSrc?: string;
  logoAlt?: string;
}

export default function Header({ siteName = 'Innovaciones Pedagógicas - ULEAM', logoSrc = '/images/logo-proyecto.png', logoAlt = 'Logo Proyecto' }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { lang, t, toggle } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#inicio', label: t.nav.home },
    { href: '#about', label: t.nav.about },
    { href: '#equipo', label: t.nav.team },
    { href: '#videos', label: t.nav.videos },
    { href: '#publicaciones', label: t.nav.publications },
    { href: '#noticias', label: t.nav.news },
    { href: '#contacto', label: t.nav.contact },
  ];

  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowAdminModal(true);
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-gradient-to-b from-uleam-blue/70 via-uleam-blue/30 to-transparent backdrop-blur-sm'
      }`}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="relative w-12 h-12 shrink-0">
              <Image
                src={logoSrc}
                alt={logoAlt}
                fill
                className="object-contain"
              />
            </div>
            <span className={`font-bold text-lg hidden lg:block ${scrolled ? 'text-uleam-blue' : 'text-white'}`}>
              {siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-4 lg:gap-6 flex-wrap justify-end">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`font-medium hover:opacity-80 transition whitespace-nowrap ${
                    scrolled ? 'text-uleam-blue' : 'text-white'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={toggle}
                className={`px-3 py-1.5 rounded-md font-bold text-sm border-2 transition ${
                  scrolled
                    ? 'border-uleam-blue text-uleam-blue hover:bg-uleam-blue hover:text-white'
                    : 'border-white text-white hover:bg-white hover:text-uleam-blue'
                }`}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
            </li>
            <li>
              <button
                onClick={handleAdminClick}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  scrolled
                    ? 'bg-uleam-blue text-white hover:bg-uleam-blue/90'
                    : 'bg-white text-uleam-blue hover:bg-white/90'
                }`}
              >
                Admin
              </button>
            </li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-md ${scrolled ? 'text-uleam-blue' : 'text-white'}`}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <ul className="md:hidden mt-4 bg-white rounded-lg shadow-lg p-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={toggle}
                className="w-full text-left py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-bold"
              >
                {lang === 'es' ? '🌐 English' : '🌐 Español'}
              </button>
            </li>
            <li>
              <button
                onClick={handleAdminClick}
                className="w-full text-left py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-medium"
              >
                Admin
              </button>
            </li>
          </ul>
        )}
      </nav>
      <AdminLoginModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </header>
  );
}
