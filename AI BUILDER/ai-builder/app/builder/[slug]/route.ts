import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await params
    const slug = decodeURIComponent(rawSlug || '').trim().toLowerCase()
    if (!slug) {
      return new Response('Not found', { status: 404 })
    }

    const project = await prisma.project.findFirst({
      where: {
        AND: [
          { metadata: { contains: `"shareSlug":"${slug}"` } },
          { metadata: { contains: '"shareEnabled":true' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        files: true,
        name: true,
      },
    })

    if (!project) {
      return new Response('Not found', { status: 404 })
    }

    const files = JSON.parse(project.files || '{}') as Record<string, string>
    const html = files['index.html']

    if (!html || !html.trim()) {
      return new Response(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${project.name}</title></head><body style="font-family:system-ui,Arial,sans-serif;padding:2rem;color:#444">This project has no published HTML yet.</body></html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache',
          },
        }
      )
    }

    let htmlOut = html

    const resolveImageData = (rawPath: string) => {
      const cleaned = rawPath.split('?')[0].split('#')[0]
      const normalized = cleaned.replace(/^\.\//, '').replace(/^\//, '')
      const imageIndex = normalized.indexOf('images/')
      const canonical = imageIndex >= 0 ? normalized.slice(imageIndex) : normalized
      return files[canonical] || files[normalized] || files[cleaned]
    }

    htmlOut = htmlOut.replace(/src=(["'])([^"']*images\/[^"']+)\1/g, (_m, q, imgPath) => {
      const dataUrl = resolveImageData(imgPath)
      return dataUrl ? `src="${dataUrl}"` : `src=${q}${imgPath}${q}`
    })

    htmlOut = htmlOut.replace(/url\((['"]?)([^'")]*images\/[^'")]+)\1\)/g, (_m, q, imgPath) => {
      const dataUrl = resolveImageData(imgPath)
      return dataUrl ? `url("${dataUrl}")` : `url(${q}${imgPath}${q})`
    })

    const navInterceptor = `<script>(function(){function norm(s){return(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}function switchTo(stem){if(!stem)return;if(typeof window.showPage==='function'){window.showPage(stem);return}if(typeof window.navigateTo==='function'){window.navigateTo(stem);return}if(typeof window.switchPage==='function'){window.switchPage(stem);return}var all=document.querySelectorAll('[id^="page-"],[class~="page-section"],[data-page-id]');all.forEach(function(s){s.style.display='none';s.classList&&s.classList.remove('active')});var ids=['page-'+stem,stem+'-page',stem+'-section','section-'+stem,stem,'page-'+norm(stem)];for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el){el.style.display='block';el.classList&&el.classList.add('active');window.scrollTo(0,0);break}}document.querySelectorAll('[data-page]').forEach(function(a){a.classList&&a.classList.remove('active')});document.querySelectorAll('[data-page="'+stem+'"],[data-page="'+norm(stem)+'"]').forEach(function(a){a.classList&&a.classList.add('active')})}function stemFromHref(href){var h=(href||'').trim();if(!h)return'';if(/^(https?:)?\/\//i.test(h))return'';if(/^(mailto:|tel:|javascript:)/i.test(h))return'';if(h.startsWith('#page-'))return norm(h.slice(6));if(h.startsWith('#'))return'';var noQuery=h.split('?')[0].split('#')[0];if(/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|json|pdf|xml|txt|zip|woff2?|ttf|otf)$/i.test(noQuery))return'';var noExt=noQuery.replace(/\.html?$/i,'');var base=noExt.split('/').filter(Boolean).pop()||noExt;base=base.split('\\').pop()||base;return norm(base)}document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('[data-page]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();switchTo(norm(el.getAttribute('data-page')||''))})});document.querySelectorAll('a[href]').forEach(function(a){var stem=stemFromHref(a.getAttribute('href')||'');if(!stem)return;a.addEventListener('click',function(e){e.preventDefault();switchTo(stem)})})})})()<\/script>`

    const bodyClose = htmlOut.toLowerCase().lastIndexOf('</body>')
    if (bodyClose !== -1) {
      htmlOut = htmlOut.slice(0, bodyClose) + navInterceptor + htmlOut.slice(bodyClose)
    } else {
      htmlOut += navInterceptor
    }

    return new Response(htmlOut, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        'Content-Security-Policy': [
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
          "img-src * data: blob:",
          "font-src * data: blob:",
          "media-src * data: blob:",
        ].join('; '),
      },
    })
  } catch {
    return new Response('Error loading project', { status: 500 })
  }
}
