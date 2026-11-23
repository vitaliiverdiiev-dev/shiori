import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui';
import { plural } from '../helpers/progress';

type Props = {
  onRemove: () => void;
  onRetry: () => void;
  rejected: number;
  retryable: number;
};

export const RefusedResults = ({
  onRemove,
  onRetry,
  rejected,
  retryable,
}: Props) => {
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
      <Popover>
        <PopoverTrigger render={<Button size="sm" variant="ghost" />}>
          Remove…
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <PopoverTitle>Remove refused results?</PopoverTitle>
          <PopoverDescription>
            {plural(rejected, 'refused result')} will be deleted from this
            device and never added to your progress. Results still waiting to be
            saved are kept.
          </PopoverDescription>
          <Button
            className="self-start"
            onClick={onRemove}
            size="sm"
            variant="destructive"
          >
            Remove refused results
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};
