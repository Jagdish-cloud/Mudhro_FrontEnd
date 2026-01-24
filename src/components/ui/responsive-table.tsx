import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface ResponsiveTableCellProps {
  children: React.ReactNode;
  className?: string;
  header?: string;
  mobileLabel?: string;
}

const ResponsiveTableContext = React.createContext<{ isMobile: boolean }>({ isMobile: false });

export const ResponsiveTable = ({ children, className, emptyMessage, loading, loadingMessage }: ResponsiveTableProps) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveTableContext.Provider value={{ isMobile }}>
      {isMobile ? (
        <div className={cn("space-y-4", className)}>
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {loadingMessage || "Loading..."}
              </CardContent>
            </Card>
          ) : (
            children
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={cn("w-full", className)}>
            {children}
          </table>
        </div>
      )}
    </ResponsiveTableContext.Provider>
  );
};

export const ResponsiveTableHeader = ({ children, className }: ResponsiveTableHeaderProps) => {
  const { isMobile } = React.useContext(ResponsiveTableContext);
  
  if (isMobile) return null;
  
  return (
    <thead className={className}>
      {children}
    </thead>
  );
};

export const ResponsiveTableBody = ({ children, className }: ResponsiveTableBodyProps) => {
  const { isMobile } = React.useContext(ResponsiveTableContext);
  
  if (isMobile) {
    return <div className={cn("space-y-4", className)}>{children}</div>;
  }
  
  return <tbody className={className}>{children}</tbody>;
};

export const ResponsiveTableRow = ({ children, className, onClick }: ResponsiveTableRowProps) => {
  const { isMobile } = React.useContext(ResponsiveTableContext);
  
  if (isMobile) {
    return (
      <Card className={cn("hover:bg-muted/50 transition-colors", onClick && "cursor-pointer", className)} onClick={onClick}>
        <CardContent className="p-4 space-y-3">
          {children}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <tr className={cn("border-b hover:bg-muted/50 transition-colors", onClick && "cursor-pointer", className)} onClick={onClick}>
      {children}
    </tr>
  );
};

export const ResponsiveTableCell = ({ children, className, header, mobileLabel }: ResponsiveTableCellProps) => {
  const { isMobile } = React.useContext(ResponsiveTableContext);
  const label = mobileLabel || header;
  
  if (isMobile) {
    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2", className)}>
        {label && (
          <span className="text-xs font-medium text-muted-foreground sm:hidden">{label}</span>
        )}
        <div className="text-sm font-medium">{children}</div>
      </div>
    );
  }
  
  return (
    <td className={cn("py-3 px-2", className)}>
      {children}
    </td>
  );
};

export const ResponsiveTableHead = ({ children, className }: ResponsiveTableHeaderProps) => {
  const { isMobile } = React.useContext(ResponsiveTableContext);
  
  if (isMobile) return null;
  
  return (
    <th className={cn("text-left py-3 px-2 text-sm font-medium text-muted-foreground", className)}>
      {children}
    </th>
  );
};

