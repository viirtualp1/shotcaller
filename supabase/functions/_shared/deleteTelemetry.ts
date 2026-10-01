interface DeleteJob {
  analytics_id: string
}

interface DeleteTransport {
  remove(id: string): Promise<{ ok: boolean; json(): Promise<unknown> }>
  acknowledge(id: string): Promise<void>
}

/** An HTTP 202 can contain deletion_errors; keep failed jobs for the next run. */
export async function deleteTelemetry(jobs: readonly DeleteJob[], transport: DeleteTransport) {
  let accepted = 0
  for (const job of jobs) {
    try {
      const response = await transport.remove(job.analytics_id)
      if (!response.ok) {
        continue
      }

      const body = (await response.json()) as {
        deletion_errors?: unknown[]
        events_queued_for_deletion?: boolean
        persons_queued_for_deletion?: number
        persons_deleted?: number
      }

      if (
        body.deletion_errors?.length ||
        body.events_queued_for_deletion !== true ||
        !(body.persons_queued_for_deletion || body.persons_deleted)
      ) {
        continue
      }

      await transport.acknowledge(job.analytics_id)
      accepted++
    } catch {
      // The durable job remains; do not log identifiers or API responses.
    }
  }

  return accepted
}
