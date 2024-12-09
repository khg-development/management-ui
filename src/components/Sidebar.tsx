import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, List } from "lucide-react"
import { Link } from "react-router-dom"

export function Sidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed left-4 top-4">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px]">
        <div className="flex flex-col space-y-4 mt-8">
          <h2 className="text-xl font-bold">Proxy Yönetimi</h2>
          <nav className="flex flex-col space-y-2">
            <Button variant="ghost" className="justify-start" asChild>
              <Link to="/proxy-list">
                <List className="mr-2 h-4 w-4" />
                Proxy Listesi
              </Link>
            </Button>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
} 