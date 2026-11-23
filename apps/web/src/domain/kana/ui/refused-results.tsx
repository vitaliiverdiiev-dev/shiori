import { type RefObject, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@/shared/ui';
import { plural } from '../helpers/progress';

type Props = {
  focusAfterRemove: RefObject<HTMLElement | null>;
  onRemove: () => void;
  onRetry: () => void;
  rejected: number;
  retryable: number;
};

export const RefusedResults = ({
  focusAfterRemove,
  onRemove,
  onRetry,
  rejected,
  retryable,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (rejected === 0) return null;

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <p className="text-destructive">
        {rejected} {rejected === 1 ? 'result was' : 'results were'} refused by
        the server and kept on this device.
      </p>
      {retryable > 0 && (
        <Button onClick={onRetry} size="sm" variant="outline">
          Send again
        </Button>
      )}
      <AlertDialog
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (isOpen || !removing) return;
          setRemoving(false);
          onRemove();
        }}
        open={open}
      >
        <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>
          Remove…
        </AlertDialogTrigger>
        <AlertDialogContent finalFocus={removing ? focusAfterRemove : true}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove refused results?</AlertDialogTitle>
            <AlertDialogDescription>
              {plural(rejected, 'refused result')} will be deleted from this
              device and never added to your progress. Results still waiting to
              be saved are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRemoving(true);
                setOpen(false);
              }}
              variant="destructive"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
