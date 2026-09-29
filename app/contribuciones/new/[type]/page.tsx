import ContributionForm from '@/components/contribuciones/ContributionForm'

export default function NewContributionPage({ params }: { params: { type: string } }) {
  return <ContributionForm tipo={params.type as any} mode="create" />
}
