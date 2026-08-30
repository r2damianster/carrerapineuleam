import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginForm from '@/components/LoginForm';

export const metadata = {
  title: 'Ingreso - Vinculación - ULEAM',
  description: 'Ingreso de estudiantes de vinculación — Proyecto PINE-ULEAM.',
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="py-16 px-4">
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
