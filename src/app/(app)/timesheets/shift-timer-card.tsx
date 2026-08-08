"use client";

import { useActionState, useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { startShiftAction, endShiftAction, type FormState } from "./actions";

const initialState: FormState = {};

interface JobOption {
  id: string;
  job_number: string;
  job_name: string;
}

interface OpenShift {
  id: string;
  started_at: string;
  job: { id: string; job_number: string; job_name: string } | null;
}

function useElapsed(startedAt: string) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      const totalMinutes = Math.max(0, Math.floor(ms / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      setElapsed(`${hours}h ${mins}m`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return elapsed;
}

function EndShiftForm({ shift }: { shift: OpenShift }) {
  const [state, formAction, pending] = useActionState(endShiftAction, initialState);
  const elapsed = useElapsed(shift.started_at);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={shift.id} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Clocked in</p>
        <p className="text-lg font-semibold text-ink-900">
          {shift.job ? `${shift.job.job_number} — ${shift.job.job_name}` : "Job"}
        </p>
        <p className="text-sm text-ink-500">Running for {elapsed}</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="break_minutes">Break (minutes)</Label>
          <Input id="break_minutes" name="break_minutes" type="number" min="0" defaultValue="0" className="w-32" />
        </div>
        <Button type="submit" variant="destructive" disabled={pending}>
          <Square className="h-3.5 w-3.5" /> {pending ? "Ending…" : "End shift"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function StartShiftForm({ jobs }: { jobs: JobOption[] }) {
  const [state, formAction, pending] = useActionState(startShiftAction, initialState);

  if (jobs.length === 0) {
    return <p className="text-sm text-ink-500">You&apos;re not assigned to any jobs yet, so there&apos;s nothing to clock into.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="job_id">Job</Label>
        <Select name="job_id" required>
          <SelectTrigger id="job_id"><SelectValue placeholder="Choose the job you're starting" /></SelectTrigger>
          <SelectContent>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.job_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        <Play className="h-3.5 w-3.5" /> {pending ? "Starting…" : "Clock in"}
      </Button>
      {state.error && <p className="text-sm text-red-600 sm:hidden">{state.error}</p>}
    </form>
  );
}

export function ShiftTimerCard({ openShift, jobs }: { openShift: OpenShift | null; jobs: JobOption[] }) {
  return (
    <Card>
      <CardContent className="pt-5">
        {openShift ? <EndShiftForm shift={openShift} /> : <StartShiftForm jobs={jobs} />}
      </CardContent>
    </Card>
  );
}
