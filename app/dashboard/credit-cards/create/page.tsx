import { Metadata } from 'next';
import Form from './_components/create-form';

export const metadata: Metadata = {
  title: 'Crear Tarjeta de Crédito',
};

export default async function Page() {

  return (
    <main>
      <Form />
    </main>
  );
}