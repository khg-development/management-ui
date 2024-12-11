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
import { Plus, X, Pencil, ChevronDown, ChevronUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RouteResponse, RouteHeader, Route, RouteCookie } from "@/types/route"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

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
  })),
  activationTime: z.string().optional(),
  expirationTime: z.string().optional(),
  cookies: z.array(z.object({
    name: z.string(),
    regexp: z.string()
  })).optional()
})

type RouteFormData = z.infer<typeof formSchema>

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "TRACE"] as const

const isoToLocalDateTime = (isoString: string | undefined) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
};

const localToUTCDateTime = (localDateStr: string) => {
  if (!localDateStr) return '';
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Date(localDateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: userTimezone
  }).replace(/(\d+)\/(\d+)\/(\d+),\s+/, '$3-$1-$2T') + getTimezoneOffset(userTimezone);
};

const getTimezoneOffset = (timezone: string) => {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const offset = (tzDate.getTime() - utcDate.getTime()) / 60000;
  
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800",
  POST: "bg-green-100 text-green-800",
  PUT: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
  HEAD: "bg-purple-100 text-purple-800",
  PATCH: "bg-orange-100 text-orange-800",
  OPTIONS: "bg-gray-100 text-gray-800",
  TRACE: "bg-indigo-100 text-indigo-800"
}

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
  const [isTimeSettingsOpen, setIsTimeSettingsOpen] = useState(false)
  const [isHeadersOpen, setIsHeadersOpen] = useState(false)
  const [cookies, setCookies] = useState<RouteCookie[]>([])
  const [newCookie, setNewCookie] = useState({
    name: '',
    regexp: ''
  })
  const [activationTime, setActivationTime] = useState<string | undefined>()
  const [expirationTime, setExpirationTime] = useState<string | undefined>()

  const form = useForm<RouteFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      routeId: "",
      path: "",
      method: "GET",
      headers: [],
      activationTime: undefined,
      expirationTime: undefined,
      cookies: []
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

      await queryClient.invalidateQueries({queryKey: ['routes', proxyName]})
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
    setActivationTime(route.activationTime ? isoToLocalDateTime(route.activationTime) : undefined)
    setExpirationTime(route.expirationTime ? isoToLocalDateTime(route.expirationTime) : undefined)
    form.reset({
      routeId: route.routeId,
      path: route.path,
      method: route.method,
      headers: route.headers,
      activationTime: route.activationTime,
      expirationTime: route.expirationTime,
      cookies: route.cookies
    })
    setCookies(route.cookies || [])
    setHeaders(route.headers)
    setOpen(true)
  }

  const onSubmit = async (data: RouteFormData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/routes/${proxyName}`, {
        method: selectedRouteId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeId: data.routeId,
          path: data.path,
          method: data.method,
          headers: data.headers,
          activationTime: data.activationTime || undefined,
          expirationTime: data.expirationTime || undefined,
          cookies: data.cookies || undefined
        })
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

  const addCookie = () => {
    if (newCookie.name && newCookie.regexp) {
      const cookie: RouteCookie = {
        name: newCookie.name,
        regexp: newCookie.regexp
      }
      setCookies([...cookies, cookie])
      form.setValue('cookies', [...cookies, cookie])
      setNewCookie({ name: '', regexp: '' })
    }
  }

  const removeCookie = (index: number) => {
    const newCookies = cookies.filter((_, i) => i !== index)
    setCookies(newCookies)
    form.setValue('cookies', newCookies)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{proxyName} Route Listesi</h1>
        <Dialog open={open} onOpenChange={(open) => {
          if (!open) {
            setSelectedRouteId("")
            setHeaders([])
            setCookies([])
            setNewHeader({ key: '', value: '', ifNotPresent: false })
            setNewCookie({ name: '', regexp: '' })
            setActivationTime(undefined)
            setExpirationTime(undefined)
            form.reset({
              routeId: "",
              path: "",
              method: "GET",
              headers: [],
              activationTime: undefined,
              expirationTime: undefined,
              cookies: []
            })
          }
          setOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Route Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[75vh] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="activationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aktivasyon Zamanı</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            value={activationTime || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              setActivationTime(value)
                              field.onChange(value ? localToUTCDateTime(value) : undefined)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expirationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bitiş Zamanı</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            value={expirationTime || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              setExpirationTime(value)
                              field.onChange(value ? localToUTCDateTime(value) : undefined)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                <div className="space-y-4">
                  <div className="font-medium">Cookie Kontrolü</div>
                  
                  <div className="space-y-2">
                    {cookies.map((cookie, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <div className="flex-1">
                          <span className="font-medium">Name: </span>
                          {cookie.name}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">Regex: </span>
                          {cookie.regexp}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCookie(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Cookie Name"
                        value={newCookie.name}
                        onChange={(e) => setNewCookie({ ...newCookie, name: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Cookie Regex"
                        value={newCookie.regexp}
                        onChange={(e) => setNewCookie({ ...newCookie, regexp: e.target.value })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCookie}
                      disabled={!newCookie.name || !newCookie.regexp}
                    >
                      Ekle
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => {
                    setOpen(false)
                    setSelectedRouteId("")
                    setHeaders([])
                    setCookies([])
                    setNewHeader({ key: '', value: '', ifNotPresent: false })
                    setNewCookie({ name: '', regexp: '' })
                    setActivationTime(undefined)
                    setExpirationTime(undefined)
                    form.reset({
                      routeId: "",
                      path: "",
                      method: "GET",
                      headers: [],
                      activationTime: undefined,
                      expirationTime: undefined,
                      cookies: []
                    })
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
          <h2 className="text-2xl font-semibold mb-4">Route Bilgisi</h2>
          {selectedRouteId ? (
            <div className="space-y-6">
              {routes.find(r => r.routeId === selectedRouteId) && (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        methodColors[routes.find(r => r.routeId === selectedRouteId)?.method || 'GET']
                      }`}>
                        {routes.find(r => r.routeId === selectedRouteId)?.method}
                      </span>
                      <span className="text-xl font-medium">
                        {routes.find(r => r.routeId === selectedRouteId)?.path}
                      </span>
                    </div>
                  </div>

                  <div className="border rounded-md">
                    <button
                      type="button"
                      onClick={() => setIsTimeSettingsOpen(!isTimeSettingsOpen)}
                      className="flex items-center justify-between w-full p-4 text-left"
                    >
                      <span className="text-lg font-medium">Aktivasyon Zaman Ayarı</span>
                      {isTimeSettingsOpen ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    
                    {isTimeSettingsOpen && (
                      <div className="p-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Aktivasyon Zamanı
                            </label>
                            <Input 
                              type="datetime-local"
                              value={isoToLocalDateTime(routes.find(r => r.routeId === selectedRouteId)?.activationTime)}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                              Bitiş Zamanı
                            </label>
                            <Input 
                              type="datetime-local"
                              value={isoToLocalDateTime(routes.find(r => r.routeId === selectedRouteId)?.expirationTime)}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-md">
                    <button
                      type="button"
                      onClick={() => setIsHeadersOpen(!isHeadersOpen)}
                      className="flex items-center justify-between w-full p-4 text-left"
                    >
                      <span className="text-lg font-medium">Request Headers</span>
                      {isHeadersOpen ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    
                    {isHeadersOpen && (
                      <div className="p-4 border-t">
                        <div className="space-y-2">
                          {routes.find(r => r.routeId === selectedRouteId)?.headers.map((header, index) => (
                            <div key={index} className="p-2 border rounded-md">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{header.key}: </span>
                                  {header.value}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {header.type === 'ADD_REQUEST_HEADER_IF_NOT_PRESENT' ? 'Eğer yoksa ekle' : 'Her zaman ekle'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {routes.find(r => r.routeId === selectedRouteId)?.headers.length === 0 && (
                            <p className="text-muted-foreground">Header bulunmamaktadır.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Lütfen bir route seçin</div>
          )}
        </div>
      </div>
    </div>
  )
} 