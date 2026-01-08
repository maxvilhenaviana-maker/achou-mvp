import { NextResponse } from 'next/server';

export function middleware(req) {
  // A Vercel fornece o código do país (ISO 3166-1 alpha-2)
  const country = req.geo?.country || 'BR'; 

  // Se estiver em desenvolvimento (localhost), req.geo pode ser undefined
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Permite acesso à página de bloqueio e arquivos estáticos (logos, etc)
  if (pathname === '/bloqueado' || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Se não for Brasil, redireciona para a página de aviso
  if (country !== 'BR') {
    return NextResponse.rewrite(new URL('/bloqueado', req.url));
  }

  return NextResponse.next();
}