import { PageTitle, Notice } from '../components/ui';

export function SoonPage({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PageTitle title={title} subtitle="Bald verfügbar" />
      <Notice>{text}</Notice>
    </>
  );
}
