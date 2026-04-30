import { TestTube01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function Tests() {
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Tests
        </h1>
        <p className="mt-2 text-muted-foreground">
          Author and run regression suites against your prompts and pipelines.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={TestTube01Icon} size={16} />
            <CardTitle className="text-base">Coming soon</CardTitle>
          </div>
          <CardDescription>
            Test sets, evaluators, and run history will live here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No test suites configured yet.</p>
        </CardContent>
      </Card>
    </>
  )
}

export default Tests
