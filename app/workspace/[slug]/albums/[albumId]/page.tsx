import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/better-auth";
import { requireViewerContext } from "@/lib/workspace";
import { getAlbum, getAlbumGroups, getAlbumImages } from "@/lib/actions/albums";
import { AlbumView } from "@/components/albums/album-view";

export const dynamic = "force-dynamic";

interface AlbumPageProps {
  params: Promise<{ slug: string; albumId: string }>;
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { slug, albumId } = await params;
  const reqHeaders = await headers();

  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({ headers: reqHeaders });
  const org = organizations.find((o) => o.slug === slug);
  if (!org) {
    redirect("/workspaces");
  }

  if (session.session.activeOrganizationId !== org.id) {
    await auth.api.setActiveOrganization({
      headers: reqHeaders,
      body: { organizationId: org.id },
    });
  }

  const viewer = await requireViewerContext();
  // getAlbum scopes by viewer.organizationId — an album id from another
  // workspace 404s here rather than leaking its existence.
  const album = await getAlbum(albumId);
  if (!album) {
    notFound();
  }

  const [groups, firstPage] = await Promise.all([getAlbumGroups(albumId), getAlbumImages(albumId)]);

  return (
    <AlbumView
      slug={slug}
      album={album}
      initialGroups={groups}
      initialImagesPage={firstPage}
      canWrite={viewer.role !== "member"}
    />
  );
}
