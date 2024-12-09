import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RouteResponse } from "@/types/route"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export function RouteList() {
  const { proxyName } = useParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")

  const { data } = useQuery<RouteResponse>({
    queryKey: ['routes', proxyName],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/routes/${proxyName}`)
      if (!response.ok) throw new Error('Route listesi alınamadı')
      return response.json()
    }
  })

  const routes = data?.routes ?? []

  const handleStatusChange = async (routeId: string, enabled: boolean) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/routes/${routeId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled })
      })

      if (!response.ok) {
        throw new Error('Route durumu güncellenemedi')
      }

      toast({
        title: "Başarılı",
        description: `Route ${enabled ? 'aktif' : 'pasif'} duruma getirildi`,
        duration: 3000,
      })

      queryClient.invalidateQueries({ queryKey: ['routes', proxyName] })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : 'Bir hata oluştu',
        duration: 3000,
      })
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">{proxyName} Route Listesi</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Route ID</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow 
                  key={route.routeId}
                  className={`cursor-pointer ${selectedRouteId === route.routeId ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedRouteId(route.routeId)}
                >
                  <TableCell>{route.path}</TableCell>
                  <TableCell>{route.method}</TableCell>
                  <TableCell>{route.routeId}</TableCell>
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                      <Switch
                        checked={route.enabled}
                        onCheckedChange={(checked) => handleStatusChange(route.routeId, checked)}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                      />
                      <span className={route.enabled ? "text-green-600" : "text-red-600"}>
                        {route.enabled ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-4">Seçili Route</h2>
          {selectedRouteId ? (
            <div className="text-lg">{selectedRouteId}</div>
          ) : (
            <div className="text-muted-foreground">Lütfen bir route seçin</div>
          )}
        </div>
      </div>
    </div>
  )
} 