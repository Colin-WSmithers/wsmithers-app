"use client";

import { useActionState, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { uploadJobDocumentAction, type FormState } from "./actions";
import { DOCUMENT_CATEGORIES } from "@/lib/validation/documents";

const initialState: FormState = {};

export function UploadDocumentDialog({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(uploadJobDocumentAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-3.5 w-3.5" /> Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="job_id" value={jobId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc_file">File</Label>
            <input
              id="doc_file"
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp"
              required
              className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc_category">Category</Label>
            <Select name="category" defaultValue="other">
              <SelectTrigger id="doc_category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc_description">Description (optional)</Label>
            <Textarea id="doc_description" name="description" rows={2} />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
