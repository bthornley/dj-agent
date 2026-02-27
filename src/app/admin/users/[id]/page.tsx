import AdminUserDetailClient from './client';

// Server component wrapper — awaits params and passes id to client
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <AdminUserDetailClient userId={id} />;
}
