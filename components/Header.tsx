'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';

interface HeaderProps {
  siteName?: string;
  logoSrc?: string;
  logoAlt?: string;
}

type NavChild = { href?: string; label: string; isHeader?: boolean };
type NavItem = { href: string; label: string; children?: undefined } | { label: string; children: NavChild[]; href?: undefined };

export default function Header({ siteName = 'Innovaciones Pedagógicas - ULEAM', logoSrc = '/images/logos/logo-proyecto.png', logoAlt = 'Logo Proyecto' }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const { lang, t, toggle } = useLanguage();
  const navRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks: NavItem[] = [
    { href: '/', label: 'Inicio' },
    { label: t.nav.docencia, children: [{ href: '/docencia/docencia-innovadora', label: t.docenciaProject.navLabel }] },
    { 
      label: t.nav.investigacion, 
      children: [
        { label: 'REDES', isHeader: true },
        { href: '/redlea', label: 'RED LEA' },
        { label: 'PROYECTOS', isHeader: true },
        { href: '/investigacion/proyecto-innovacion', label: 'Innovaciones Pedagógicas' },
        { href: '/investigacion/desarrollo-habilidades', label: 'Desarrollo de las habilidades lingüísticas' },
        { href: '/investigacion/mentoria-linguistica', label: 'Mentoría en el Desarrollo Lingüístico' }
      ] 
    },
    { label: t.nav.vinculacion, children: [{ href: '/vinculacion/dinamicas-linguisticas', label: t.vinculacionProject.navLabel }] },
  ];

  const toggleDropdown = (label: string) => {
    setOpenDropdown((current) => (current === label ? null : label));
  };

  const toggleMobileDropdown = (label: string) => {
    setOpenMobileDropdown((current) => (current === label ? null : label));
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
            <span className={`font-bold text-lg hidden lg:block leading-tight ${scrolled ? 'text-uleam-blue' : 'text-white'}`}>
              {siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul ref={navRef} className="hidden md:flex items-center gap-4 lg:gap-6 flex-wrap justify-end">
            {navLinks.map((link) =>
              link.children ? (
                <li key={link.label} className="relative">
                  <button
                    onClick={() => toggleDropdown(link.label)}
                    className={`flex items-center gap-1 font-medium hover:opacity-80 transition whitespace-nowrap ${
                      scrolled ? 'text-uleam-blue' : 'text-white'
                    }`}
                    aria-expanded={openDropdown === link.label}
                  >
                    {link.label}
                    <svg
                      className={`w-4 h-4 transition-transform ${openDropdown === link.label ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === link.label && (
                    <ul className="absolute left-0 mt-2 min-w-[260px] bg-white rounded-lg shadow-xl py-2 z-50">
                      {link.children.map((child, i) => (
                        <li key={child.href || i}>
                          {child.isHeader ? (
                            <span className="block px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 first:mt-0">
                              {child.label}
                            </span>
                          ) : (
                            <Link
                              href={child.href!}
                              className="block px-4 py-2 text-sm text-uleam-blue hover:bg-gray-100 transition"
                              onClick={() => setOpenDropdown(null)}
                            >
                              {child.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
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
              )
            )}
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
              <Link
                href="/portal/login"
                className={`px-4 py-2 rounded-md font-medium transition ${
                  scrolled
                    ? 'bg-uleam-blue text-white hover:bg-uleam-blue/90'
                    : 'bg-white text-uleam-blue hover:bg-white/90'
                }`}
              >
                Portal PINE
              </Link>
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
            {navLinks.map((link) =>
              link.children ? (
                <li key={link.label}>
                  <button
                    onClick={() => toggleMobileDropdown(link.label)}
                    className="w-full flex items-center justify-between py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-medium"
                    aria-expanded={openMobileDropdown === link.label}
                  >
                    {link.label}
                    <svg
                      className={`w-4 h-4 transition-transform ${openMobileDropdown === link.label ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openMobileDropdown === link.label && (
                    <ul className="pl-4">
                      {link.children.map((child, i) => (
                        <li key={child.href || i}>
                          {child.isHeader ? (
                            <span className="block py-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 first:mt-0">
                              {child.label}
                            </span>
                          ) : (
                            <Link
                              href={child.href!}
                              className="block py-2 px-4 text-sm text-uleam-blue hover:bg-gray-100 rounded ml-2"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setOpenMobileDropdown(null);
                              }}
                            >
                              {child.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            )}
            <li>
              <button
                onClick={toggle}
                className="w-full text-left py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-bold"
              >
                {lang === 'es' ? '🌐 English' : '🌐 Español'}
              </button>
            </li>
            <li>
              <Link
                href="/portal/login"
                className="block w-full text-left py-2 px-4 text-uleam-blue hover:bg-gray-100 rounded font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Portal PINE
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
