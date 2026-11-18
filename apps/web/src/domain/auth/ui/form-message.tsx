type Props = {
  children: string;
  tone: 'error' | 'success';
};

export const FormMessage = ({ children, tone }: Props) =>
  tone === 'error' ? (
    <p className="text-sm text-destructive" role="alert">
      {children}
    </p>
  ) : (
    <p className="text-sm text-success" role="status">
      {children}
    </p>
  );
