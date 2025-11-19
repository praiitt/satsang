import { headers } from 'next/headers';
import { CreateGuruView } from '@/components/app/create-guru-view';

export default async function CreateGuruPage() {
  await headers();
  return <CreateGuruView />;
}
