import { Link, useLocation } from 'react-router';
import { AccountControls, authPaths } from '@/domain/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/shared/ui';
import { AppLogo } from '../../branding/app-logo';
import {
  getNavigation,
  isNavigationItemActive,
} from '../../routing/route-metadata';

export const AppSidebar = () => {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          className="flex min-h-11 items-center self-start rounded-md px-2 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          onClick={closeMobile}
          to={authPaths.home}
        >
          <AppLogo size="sm" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main">
          {getNavigation().map(({ group, items, label }) => (
            <SidebarGroup key={group}>
              {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {items.map((item) => {
                    const active = isNavigationItemActive(item, pathname);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={active}
                          render={
                            <Link
                              aria-current={active ? 'page' : undefined}
                              onClick={closeMobile}
                              to={item.path}
                            />
                          }
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <AccountControls />
      </SidebarFooter>
    </Sidebar>
  );
};
