import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ApiProxyResponse, PageableResponse } from "@/types/proxy"
import { useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as z from "zod"

// Form şeması
const formSchema = z.object({
  name: z.string().min(1, "Proxy adı boş olamaz"),
  uri: z.string().min(1, "URI boş olamaz"),
  description: z.string().optional(),
})

type ProxyFormData = z.infer<typeof formSchema>

export function ProxyList() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedProxy, setSelectedProxy] = useState<ApiProxyResponse | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  
  const form = useForm<ProxyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      uri: "",
      description: "",
    },
  })

  const onSubmit = async (data: ProxyFormData) => {
    try {
      const url = selectedProxy 
        ? `${import.meta.env.VITE_API_URL}/api/v1/proxies/${selectedProxy.id}`
        : `${import.meta.env.VITE_API_URL}/api/v1/proxies`

      const response = await fetch(url, {
        method: selectedProxy ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(selectedProxy ? 'Proxy güncellenemedi' : 'Proxy eklenemedi')
      }

      toast({
        title: "Başarılı",
        description: selectedProxy ? "Proxy başarıyla güncellendi" : "Proxy başarıyla eklendi",
        duration: 3000,
      })
      
      setOpen(false)
      setSelectedProxy(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['proxies'] })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : 'Bir hata oluştu',
        duration: 3000,
      })
    }
  }

  const handleEdit = (proxy: ApiProxyResponse) => {
    setSelectedProxy(proxy)
    form.reset({
      name: proxy.name,
      uri: proxy.uri,
      description: proxy.description || "",
    })
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/proxies/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Proxy silinemedi')
      }

      toast({
        title: "Başarılı",
        description: "Proxy başarıyla silindi",
        duration: 3000,
      })
      
      queryClient.invalidateQueries({ queryKey: ['proxies'] })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : 'Bir hata oluştu',
        duration: 3000,
      })
    } finally {
      setDeleteId(null)
    }
  }

  const fetchProxies = async (): Promise<PageableResponse<ApiProxyResponse>> => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/proxies?page=${page}&size=${size}&sortBy=createdAt&direction=desc`
    )
    if (!response.ok) {
      throw new Error('Proxy listesi alınamadı')
    }
    return response.json()
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['proxies', page, size],
    queryFn: fetchProxies
  })

  const proxies = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : 'Bir hata oluştu',
        duration: 3000,
      })
    }
  }, [error, toast])

  if (isLoading) {
    return <div className="p-4">Yükleniyor...</div>
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Proxy Listesi</h1>
        <Dialog open={open} onOpenChange={(open) => {
          if (!open) {
            setSelectedProxy(null)
            form.reset({
              name: "",
              uri: "",
              description: "",
            })
          }
          setOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Proxy Ekle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedProxy ? 'Proxy Güncelle' : 'Yeni Proxy Ekle'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proxy Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Proxy adını giriniz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URI</FormLabel>
                      <FormControl>
                        <Input placeholder="URI giriniz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Açıklama</FormLabel>
                      <FormControl>
                        <Input placeholder="Açıklama giriniz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => {
                    setOpen(false)
                    setSelectedProxy(null)
                    form.reset()
                  }} className="w-full">
                    İptal
                  </Button>
                  <Button type="submit" className="w-full">
                    {selectedProxy ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      {proxies.length === 0 ? (
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground">Henüz proxy bulunmamaktadır.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>İsim</TableHead>
                  <TableHead>URI</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Oluşturulma Tarihi</TableHead>
                  <TableHead>Güncellenme Tarihi</TableHead>
                  <TableHead className="w-[100px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell>{proxy.id}</TableCell>
                    <TableCell>{proxy.name}</TableCell>
                    <TableCell>{proxy.uri}</TableCell>
                    <TableCell>{proxy.description}</TableCell>
                    <TableCell>
                      {new Date(proxy.createdAt).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      {proxy.updatedAt 
                        ? new Date(proxy.updatedAt).toLocaleString('tr-TR')
                        : ''
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(proxy)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(proxy.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-center px-2">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={!data?.hasPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[100px] text-center text-sm">
                <span>Sayfa {data?.currentPage! + 1} / {totalPages}</span>
                <span className="text-muted-foreground">({data?.totalElements} kayıt)</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data?.hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silme İşlemini Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              Bu proxy'yi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 