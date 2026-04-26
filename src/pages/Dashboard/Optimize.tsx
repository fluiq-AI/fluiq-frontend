import { MagicWand01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function Optimize() {
  return (
    <>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Optimize
        </h1>
        <p className="mt-2 text-muted-foreground">
          Auto-tune prompts, model choice, and routing against your benchmarks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={MagicWand01Icon} size={16} />
            <CardTitle className="text-base">Coming soon</CardTitle>
          </div>
          <CardDescription>
            Optimization runs will surface suggestions backed by your trace data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No optimization runs yet.</p>
        </CardContent>
      </Card>
    </>
  )
}

export default Optimize
