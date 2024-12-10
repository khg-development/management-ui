import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { useState } from "react"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X, Pencil } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RouteResponse, RouteHeader, Route } from "@/types/route"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

// Form şeması
const formSchema = z.object({
  routeId: z.string().min(1, "Route ID boş olamaz"),
  path: z.string().min(1, "Path boş olamaz"),
  method: z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE"], {
    required_error: "Method seçilmesi zorunludur"
  }),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
    type: z.enum(['ADD_REQUEST_HEADER', 'ADD_REQUEST_HEADER_IF_NOT_PRESENT'])
  }))
})

type RouteFormData = z.infer<typeof formSchema>

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE"] as const

export function RouteList() {
  const { proxyName } = useParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")
  const [headers, setHeaders] = useState<RouteHeader[]>([])
  const [newHeader, setNewHeader] = useState({
    key: '',
    value: '',
    ifNotPresent: false
  })

  const form = useForm<RouteFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      routeId: "",
      path: "",
      method: "GET",
      headers: []
    }
  })

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/routes/${proxyName}/${routeId}/status`, {
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

  const handleEdit = (route: Route) => {
    setSelectedRouteId(route.routeId)
    form.reset({
      routeId: route.routeId,
      path: route.path,
      method: route.method,
      headers: route.headers
    })
    setHeaders(route.headers)
    setOpen(true)
  }

  const onSubmit = async (data: RouteFormData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/routes/${proxyName}`, {
        method: selectedRouteId ? 'PUT' : 'POST', // Eğer selectedRouteId varsa güncelleme
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(selectedRouteId ? 'Route güncellenemedi' : 'Route eklenemedi')
      }

      toast({
        title: "Başarılı",
        description: selectedRouteId ? "Route başarıyla güncellendi" : "Route başarıyla eklendi",
        duration: 3000,
      })
      
      setOpen(false)
      setSelectedRouteId("")
      form.reset()
      setHeaders([])
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

  const addHeader = () => {
    if (newHeader.key && newHeader.value) {
      const header: RouteHeader = {
        key: newHeader.key,
        value: newHeader.value,
        type: newHeader.ifNotPresent ? 'ADD_REQUEST_HEADER_IF_NOT_PRESENT' : 'ADD_REQUEST_HEADER'
      }
      setHeaders([...headers, header])
      form.setValue('headers', [...headers, header])
      setNewHeader({ key: '', value: '', ifNotPresent: false })
    }
  }

  const removeHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index)
    setHeaders(newHeaders)
    form.setValue('headers', newHeaders)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{proxyName} Route Listesi</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Route Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRouteId ? 'Route Güncelle' : 'Yeni Route Ekle'}
              </DialogTitle>
              <DialogDescription>
                Route bilgilerini aşağıdaki forma girerek ekleyebilirsiniz.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="routeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Route ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Route ID giriniz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <Input placeholder="Path giriniz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Method seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <div className="font-medium">Request Headers</div>
                  
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <div className="flex-1">{header.key}: {header.value}</div>
                        <div className="text-sm text-muted-foreground">
                          {header.type === 'ADD_REQUEST_HEADER_IF_NOT_PRESENT' ? 'Eğer yoksa ekle' : 'Her zaman ekle'}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHeader(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Header Key"
                        value={newHeader.key}
                        onChange={(e) => setNewHeader({ ...newHeader, key: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Header Value"
                        value={newHeader.value}
                        onChange={(e) => setNewHeader({ ...newHeader, value: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newHeader.ifNotPresent}
                        onCheckedChange={(checked) => 
                          setNewHeader({ ...newHeader, ifNotPresent: checked as boolean })
                        }
                      />
                      <span className="text-sm">Eğer yoksa ekle</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addHeader}
                      disabled={!newHeader.key || !newHeader.value}
                    >
                      Ekle
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => {
                    setOpen(false)
                    form.reset()
                  }} className="w-full">
                    İptal
                  </Button>
                  <Button type="submit" className="w-full">
                    {selectedRouteId ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Route ID</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
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
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(route)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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