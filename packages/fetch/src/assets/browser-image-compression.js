/**
 * Browser Image Compression
 * v2.0.2
 * by Donald <donaldcwl@gmail.com>
 * https://github.com/Donaldcwl/browser-image-compression
 */

!(function (e, t) {
  typeof exports == 'object' && typeof module != 'undefined'
    ? (module.exports = t())
    : typeof define == 'function' && define.amd
      ? define(t)
      : ((e
          = typeof globalThis != 'undefined'
            ? globalThis
            : e || self).imageCompression = t())
})(this, () => {
  'use strict'
  function _mergeNamespaces(e, t) {
    return (
      t.forEach((t) => {
        t
        && typeof t != 'string'
        && !Array.isArray(t)
        && Object.keys(t).forEach((r) => {
          if (r !== 'default' && !(r in e)) {
            const i = Object.getOwnPropertyDescriptor(t, r)
            Object.defineProperty(
              e,
              r,
              i.get
                ? i
                : {
                    enumerable: !0,
                    get() {
                      return t[r]
                    },
                  },
            )
          }
        })
      }),
      Object.freeze(e)
    )
  }
  function copyExifWithoutOrientation(e, t) {
    return new Promise((r, i) => {
      let o
      return getApp1Segment(e).then((e) => {
        try {
          return (
            (o = e),
            r(new Blob([t.slice(0, 2), o, t.slice(2)], { type: 'image/jpeg' }))
          )
        }
        catch (e) {
          return i(e)
        }
      }, i)
    })
  }
  const getApp1Segment = e =>
    new Promise((t, r) => {
      const i = new FileReader();
      (i.addEventListener('load', ({ target: { result: e } }) => {
        const i = new DataView(e)
        let o = 0
        if (i.getUint16(o) !== 65496)
          return r('not a valid JPEG')
        for (o += 2; ;) {
          const a = i.getUint16(o)
          if (a === 65498)
            break
          const s = i.getUint16(o + 2)
          if (a === 65505 && i.getUint32(o + 4) === 1165519206) {
            const a = o + 10
            let f
            switch (i.getUint16(a)) {
              case 18761:
                f = !0
                break
              case 19789:
                f = !1
                break
              default:
                return r('TIFF header contains invalid endian')
            }
            if (i.getUint16(a + 2, f) !== 42)
              return r('TIFF header contains invalid version')
            const l = i.getUint32(a + 4, f)
            const c = a + l + 2 + 12 * i.getUint16(a + l, f)
            for (let e = a + l + 2; e < c; e += 12) {
              if (i.getUint16(e, f) == 274) {
                if (i.getUint16(e + 2, f) !== 3)
                  return r('Orientation data type is invalid')
                if (i.getUint32(e + 4, f) !== 1)
                  return r('Orientation data count is invalid')
                i.setUint16(e + 8, 1, f)
                break
              }
            }
            return t(e.slice(o, o + 2 + s))
          }
          o += 2 + s
        }
        return t(new Blob())
      }),
      i.readAsArrayBuffer(e))
    })
  let e = {}
  !(function (e) {
    let t
    let r
    const UZIP = {};
    ((e.exports = UZIP),
    (UZIP.parse = function (e, t) {
      for (
        var r = UZIP.bin.readUshort,
          i = UZIP.bin.readUint,
          o = 0,
          a = {},
          s = new Uint8Array(e),
          f = s.length - 4;
        i(s, f) != 101010256;

      )
        f--
      o = f
      o += 4
      const l = r(s, (o += 4))
      r(s, (o += 2))
      let c = i(s, (o += 2))
      const u = i(s, (o += 4));
      ((o += 4), (o = u))
      for (let h = 0; h < l; h++) {
        (i(s, o), (o += 4), (o += 4), (o += 4), i(s, (o += 4)))
        c = i(s, (o += 4))
        const d = i(s, (o += 4))
        const A = r(s, (o += 4))
        const g = r(s, o + 2)
        const p = r(s, o + 4)
        o += 6
        const m = i(s, (o += 8));
        ((o += 4), (o += A + g + p), UZIP._readLocal(s, m, a, c, d, t))
      }
      return a
    }),
    (UZIP._readLocal = function (e, t, r, i, o, a) {
      const s = UZIP.bin.readUshort
      const f = UZIP.bin.readUint;
      (f(e, t), s(e, (t += 4)), s(e, (t += 2)))
      const l = s(e, (t += 2));
      (f(e, (t += 2)), f(e, (t += 4)), (t += 4))
      const c = s(e, (t += 8))
      const u = s(e, (t += 2))
      t += 2
      const h = UZIP.bin.readUTF8(e, t, c)
      if (((t += c), (t += u), a)) {
        r[h] = { size: o, csize: i }
      }
      else {
        const d = new Uint8Array(e.buffer, t)
        if (l == 0) {
          r[h] = new Uint8Array(d.buffer.slice(t, t + i))
        }
        else {
          if (l != 8)
            throw `unknown compression method: ${l}`
          const A = new Uint8Array(o);
          (UZIP.inflateRaw(d, A), (r[h] = A))
        }
      }
    }),
    (UZIP.inflateRaw = function (e, t) {
      return UZIP.F.inflate(e, t)
    }),
    (UZIP.inflate = function (e, t) {
      return (
        e[0],
        e[1],
        UZIP.inflateRaw(
          new Uint8Array(e.buffer, e.byteOffset + 2, e.length - 6),
          t,
        )
      )
    }),
    (UZIP.deflate = function (e, t) {
      t == null && (t = { level: 6 })
      let r = 0
      const i = new Uint8Array(50 + Math.floor(1.1 * e.length));
      ((i[r] = 120),
      (i[r + 1] = 156),
      (r += 2),
      (r = UZIP.F.deflateRaw(e, i, r, t.level)))
      const o = UZIP.adler(e, 0, e.length)
      return (
        (i[r + 0] = (o >>> 24) & 255),
        (i[r + 1] = (o >>> 16) & 255),
        (i[r + 2] = (o >>> 8) & 255),
        (i[r + 3] = (o >>> 0) & 255),
        new Uint8Array(i.buffer, 0, r + 4)
      )
    }),
    (UZIP.deflateRaw = function (e, t) {
      t == null && (t = { level: 6 })
      const r = new Uint8Array(50 + Math.floor(1.1 * e.length))
      var i = UZIP.F.deflateRaw(e, r, i, t.level)
      return new Uint8Array(r.buffer, 0, i)
    }),
    (UZIP.encode = function (e, t) {
      t == null && (t = !1)
      let r = 0
      const i = UZIP.bin.writeUint
      const o = UZIP.bin.writeUshort
      const a = {}
      for (var s in e) {
        const f = !UZIP._noNeed(s) && !t
        const l = e[s]
        const c = UZIP.crc.crc(l, 0, l.length)
        a[s] = {
          cpr: f,
          usize: l.length,
          crc: c,
          file: f ? UZIP.deflateRaw(l) : l,
        }
      }
      for (var s in a)
        r += a[s].file.length + 30 + 46 + 2 * UZIP.bin.sizeUTF8(s)
      r += 22
      const u = new Uint8Array(r)
      let h = 0
      const d = []
      for (var s in a) {
        var A = a[s];
        (d.push(h), (h = UZIP._writeHeader(u, h, s, A, 0)))
      }
      let g = 0
      const p = h
      for (var s in a) {
        A = a[s];
        (d.push(h), (h = UZIP._writeHeader(u, h, s, A, 1, d[g++])))
      }
      const m = h - p
      return (
        i(u, h, 101010256),
        (h += 4),
        o(u, (h += 4), g),
        o(u, (h += 2), g),
        i(u, (h += 2), m),
        i(u, (h += 4), p),
        (h += 4),
        (h += 2),
        u.buffer
      )
    }),
    (UZIP._noNeed = function (e) {
      const t = e.split('.').pop().toLowerCase()
      return 'png,jpg,jpeg,zip'.includes(t)
    }),
    (UZIP._writeHeader = function (e, t, r, i, o, a) {
      const s = UZIP.bin.writeUint
      const f = UZIP.bin.writeUshort
      const l = i.file
      return (
        s(e, t, o == 0 ? 67324752 : 33639248),
        (t += 4),
        o == 1 && (t += 2),
        f(e, t, 20),
        f(e, (t += 2), 0),
        f(e, (t += 2), i.cpr ? 8 : 0),
        s(e, (t += 2), 0),
        s(e, (t += 4), i.crc),
        s(e, (t += 4), l.length),
        s(e, (t += 4), i.usize),
        f(e, (t += 4), UZIP.bin.sizeUTF8(r)),
        f(e, (t += 2), 0),
        (t += 2),
        o == 1 && ((t += 2), (t += 2), s(e, (t += 6), a), (t += 4)),
        (t += UZIP.bin.writeUTF8(e, t, r)),
        o == 0 && (e.set(l, t), (t += l.length)),
        t
      )
    }),
    (UZIP.crc = {
      table: (function () {
        for (var e = new Uint32Array(256), t = 0; t < 256; t++) {
          for (var r = t, i = 0; i < 8; i++)
            1 & r ? (r = 3988292384 ^ (r >>> 1)) : (r >>>= 1)
          e[t] = r
        }
        return e
      })(),
      update(e, t, r, i) {
        for (let o = 0; o < i; o++)
          e = UZIP.crc.table[255 & (e ^ t[r + o])] ^ (e >>> 8)
        return e
      },
      crc(e, t, r) {
        return 4294967295 ^ UZIP.crc.update(4294967295, e, t, r)
      },
    }),
    (UZIP.adler = function (e, t, r) {
      for (var i = 1, o = 0, a = t, s = t + r; a < s;) {
        for (let f = Math.min(a + 5552, s); a < f;) o += i += e[a++];
        ((i %= 65521), (o %= 65521))
      }
      return (o << 16) | i
    }),
    (UZIP.bin = {
      readUshort(e, t) {
        return e[t] | (e[t + 1] << 8)
      },
      writeUshort(e, t, r) {
        ((e[t] = 255 & r), (e[t + 1] = (r >> 8) & 255))
      },
      readUint(e, t) {
        return (
          16777216 * e[t + 3] + ((e[t + 2] << 16) | (e[t + 1] << 8) | e[t])
        )
      },
      writeUint(e, t, r) {
        ((e[t] = 255 & r),
        (e[t + 1] = (r >> 8) & 255),
        (e[t + 2] = (r >> 16) & 255),
        (e[t + 3] = (r >> 24) & 255))
      },
      readASCII(e, t, r) {
        for (var i = '', o = 0; o < r; o++)
          i += String.fromCharCode(e[t + o])
        return i
      },
      writeASCII(e, t, r) {
        for (let i = 0; i < r.length; i++) e[t + i] = r.charCodeAt(i)
      },
      pad(e) {
        return e.length < 2 ? `0${e}` : e
      },
      readUTF8(e, t, r) {
        for (var i, o = '', a = 0; a < r; a++)
          o += `%${UZIP.bin.pad(e[t + a].toString(16))}`
        try {
          i = decodeURIComponent(o)
        }
        catch (i) {
          return UZIP.bin.readASCII(e, t, r)
        }
        return i
      },
      writeUTF8(e, t, r) {
        for (var i = r.length, o = 0, a = 0; a < i; a++) {
          const s = r.charCodeAt(a)
          if ((4294967168 & s) == 0) {
            ((e[t + o] = s), o++)
          }
          else if ((4294965248 & s) == 0) {
            ((e[t + o] = 192 | (s >> 6)),
            (e[t + o + 1] = 128 | ((s >> 0) & 63)),
            (o += 2))
          }
          else if ((4294901760 & s) == 0) {
            ((e[t + o] = 224 | (s >> 12)),
            (e[t + o + 1] = 128 | ((s >> 6) & 63)),
            (e[t + o + 2] = 128 | ((s >> 0) & 63)),
            (o += 3))
          }
          else {
            if ((4292870144 & s) != 0)
              throw 'e';
            ((e[t + o] = 240 | (s >> 18)),
            (e[t + o + 1] = 128 | ((s >> 12) & 63)),
            (e[t + o + 2] = 128 | ((s >> 6) & 63)),
            (e[t + o + 3] = 128 | ((s >> 0) & 63)),
            (o += 4))
          }
        }
        return o
      },
      sizeUTF8(e) {
        for (var t = e.length, r = 0, i = 0; i < t; i++) {
          const o = e.charCodeAt(i)
          if ((4294967168 & o) == 0) {
            r++
          }
          else if ((4294965248 & o) == 0) {
            r += 2
          }
          else if ((4294901760 & o) == 0) {
            r += 3
          }
          else {
            if ((4292870144 & o) != 0)
              throw 'e'
            r += 4
          }
        }
        return r
      },
    }),
    (UZIP.F = {}),
    (UZIP.F.deflateRaw = function (e, t, r, i) {
      const o = [
        [0, 0, 0, 0, 0],
        [4, 4, 8, 4, 0],
        [4, 5, 16, 8, 0],
        [4, 6, 16, 16, 0],
        [4, 10, 16, 32, 0],
        [8, 16, 32, 32, 0],
        [8, 16, 128, 128, 0],
        [8, 32, 128, 256, 0],
        [32, 128, 258, 1024, 1],
        [32, 258, 258, 4096, 1],
      ][i]
      const a = UZIP.F.U
      const s = UZIP.F._goodIndex
      UZIP.F._hash
      const f = UZIP.F._putsE
      let l = 0
      let c = r << 3
      let u = 0
      const h = e.length
      if (i == 0) {
        for (; l < h;) {
          (f(t, c, l + (_ = Math.min(65535, h - l)) == h ? 1 : 0),
          (c = UZIP.F._copyExact(e, l, _, t, c + 8)),
          (l += _))
        }
        return c >>> 3
      }
      const d = a.lits
      const A = a.strt
      const g = a.prev
      let p = 0
      let m = 0
      let w = 0
      let v = 0
      let b = 0
      let y = 0
      for (h > 2 && (A[(y = UZIP.F._hash(e, 0))] = 0), l = 0; l < h; l++) {
        if (((b = y), l + 1 < h - 2)) {
          y = UZIP.F._hash(e, l + 1)
          const E = (l + 1) & 32767;
          ((g[E] = A[y]), (A[y] = E))
        }
        if (u <= l) {
          (p > 14e3 || m > 26697)
          && h - l > 100
          && (u < l && ((d[p] = l - u), (p += 2), (u = l)),
          (c = UZIP.F._writeBlock(
            l == h - 1 || u == h ? 1 : 0,
            d,
            p,
            v,
            e,
            w,
            l - w,
            t,
            c,
          )),
          (p = m = v = 0),
          (w = l))
          let F = 0
          l < h - 2
          && (F = UZIP.F._bestMatch(e, l, g, b, Math.min(o[2], h - l), o[3]))
          var _ = F >>> 16
          let B = 65535 & F
          if (F != 0) {
            B = 65535 & F
            const U = s((_ = F >>> 16), a.of0)
            a.lhst[257 + U]++
            const C = s(B, a.df0);
            (a.dhst[C]++,
            (v += a.exb[U] + a.dxb[C]),
            (d[p] = (_ << 23) | (l - u)),
            (d[p + 1] = (B << 16) | (U << 8) | C),
            (p += 2),
            (u = l + _))
          }
          else {
            a.lhst[e[l]]++
          }
          m++
        }
      }
      for (
        (w == l && e.length != 0)
        || (u < l && ((d[p] = l - u), (p += 2), (u = l)),
        (c = UZIP.F._writeBlock(1, d, p, v, e, w, l - w, t, c)),
        (p = 0),
        (m = 0),
        (p = m = v = 0),
        (w = l));
        (7 & c) != 0;

      )
        c++
      return c >>> 3
    }),
    (UZIP.F._bestMatch = function (e, t, r, i, o, a) {
      let s = 32767 & t
      let f = r[s]
      let l = (s - f + 32768) & 32767
      if (f == s || i != UZIP.F._hash(e, t - l))
        return 0
      for (
        var c = 0, u = 0, h = Math.min(32767, t);
        l <= h && --a != 0 && f != s;

      ) {
        if (c == 0 || e[t + c] == e[t + c - l]) {
          let d = UZIP.F._howLong(e, t, l)
          if (d > c) {
            if (((u = l), (c = d) >= o))
              break
            l + 2 < d && (d = l + 2)
            for (let A = 0, g = 0; g < d - 2; g++) {
              const p = (t - l + g + 32768) & 32767
              const m = (p - r[p] + 32768) & 32767
              m > A && ((A = m), (f = p))
            }
          }
        }
        l += ((s = f) - (f = r[s]) + 32768) & 32767
      }
      return (c << 16) | u
    }),
    (UZIP.F._howLong = function (e, t, r) {
      if (
        e[t] != e[t - r]
        || e[t + 1] != e[t + 1 - r]
        || e[t + 2] != e[t + 2 - r]
      ) {
        return 0
      }
      const i = t
      const o = Math.min(e.length, t + 258)
      for (t += 3; t < o && e[t] == e[t - r];) t++
      return t - i
    }),
    (UZIP.F._hash = function (e, t) {
      return (((e[t] << 8) | e[t + 1]) + (e[t + 2] << 4)) & 65535
    }),
    (UZIP.saved = 0),
    (UZIP.F._writeBlock = function (e, t, r, i, o, a, s, f, l) {
      let c
      let u
      let h
      let d
      let A
      let g
      let p
      let m
      let w
      const v = UZIP.F.U
      const b = UZIP.F._putsF
      const y = UZIP.F._putsE;
      (v.lhst[256]++,
      (u = (c = UZIP.F.getTrees())[0]),
      (h = c[1]),
      (d = c[2]),
      (A = c[3]),
      (g = c[4]),
      (p = c[5]),
      (m = c[6]),
      (w = c[7]))
      const E = 32 + (((l + 3) & 7) == 0 ? 0 : 8 - ((l + 3) & 7)) + (s << 3)
      const F
        = i
          + UZIP.F.contSize(v.fltree, v.lhst)
          + UZIP.F.contSize(v.fdtree, v.dhst)
      let _
        = i
          + UZIP.F.contSize(v.ltree, v.lhst)
          + UZIP.F.contSize(v.dtree, v.dhst)
      _
        += 14
          + 3 * p
          + UZIP.F.contSize(v.itree, v.ihst)
          + (2 * v.ihst[16] + 3 * v.ihst[17] + 7 * v.ihst[18])
      for (var B = 0; B < 286; B++) v.lhst[B] = 0
      for (B = 0; B < 30; B++) v.dhst[B] = 0
      for (B = 0; B < 19; B++) v.ihst[B] = 0
      const U = E < F && E < _ ? 0 : F < _ ? 1 : 2
      if ((b(f, l, e), b(f, l + 1, U), (l += 3), U == 0)) {
        for (; (7 & l) != 0;) l++
        l = UZIP.F._copyExact(o, a, s, f, l)
      }
      else {
        let C, I
        if ((U == 1 && ((C = v.fltree), (I = v.fdtree)), U == 2)) {
          (UZIP.F.makeCodes(v.ltree, u),
          UZIP.F.revCodes(v.ltree, u),
          UZIP.F.makeCodes(v.dtree, h),
          UZIP.F.revCodes(v.dtree, h),
          UZIP.F.makeCodes(v.itree, d),
          UZIP.F.revCodes(v.itree, d),
          (C = v.ltree),
          (I = v.dtree),
          y(f, l, A - 257),
          y(f, (l += 5), g - 1),
          y(f, (l += 5), p - 4),
          (l += 4))
          for (let Q = 0; Q < p; Q++)
            y(f, l + 3 * Q, v.itree[1 + (v.ordr[Q] << 1)]);
          ((l += 3 * p),
          (l = UZIP.F._codeTiny(m, v.itree, f, l)),
          (l = UZIP.F._codeTiny(w, v.itree, f, l)))
        }
        for (let M = a, x = 0; x < r; x += 2) {
          for (var T = t[x], S = T >>> 23, R = M + (8388607 & T); M < R;)
            l = UZIP.F._writeLit(o[M++], C, f, l)
          if (S != 0) {
            const O = t[x + 1]
            const P = O >> 16
            const H = (O >> 8) & 255
            const L = 255 & O;
            (y(f, (l = UZIP.F._writeLit(257 + H, C, f, l)), S - v.of0[H]),
            (l += v.exb[H]),
            b(f, (l = UZIP.F._writeLit(L, I, f, l)), P - v.df0[L]),
            (l += v.dxb[L]),
            (M += S))
          }
        }
        l = UZIP.F._writeLit(256, C, f, l)
      }
      return l
    }),
    (UZIP.F._copyExact = function (e, t, r, i, o) {
      let a = o >>> 3
      return (
        (i[a] = r),
        (i[a + 1] = r >>> 8),
        (i[a + 2] = 255 - i[a]),
        (i[a + 3] = 255 - i[a + 1]),
        (a += 4),
        i.set(new Uint8Array(e.buffer, t, r), a),
        o + ((r + 4) << 3)
      )
    }),
    (UZIP.F.getTrees = function () {
      for (
        var e = UZIP.F.U,
          t = UZIP.F._hufTree(e.lhst, e.ltree, 15),
          r = UZIP.F._hufTree(e.dhst, e.dtree, 15),
          i = [],
          o = UZIP.F._lenCodes(e.ltree, i),
          a = [],
          s = UZIP.F._lenCodes(e.dtree, a),
          f = 0;
        f < i.length;
        f += 2
      )
        e.ihst[i[f]]++
      for (f = 0; f < a.length; f += 2) e.ihst[a[f]]++
      for (
        var l = UZIP.F._hufTree(e.ihst, e.itree, 7), c = 19;
        c > 4 && e.itree[1 + (e.ordr[c - 1] << 1)] == 0;

      )
        c--
      return [t, r, l, o, s, c, i, a]
    }),
    (UZIP.F.getSecond = function (e) {
      for (var t = [], r = 0; r < e.length; r += 2) t.push(e[r + 1])
      return t
    }),
    (UZIP.F.nonZero = function (e) {
      for (var t = '', r = 0; r < e.length; r += 2)
        e[r + 1] != 0 && (t += `${r >> 1},`)
      return t
    }),
    (UZIP.F.contSize = function (e, t) {
      for (var r = 0, i = 0; i < t.length; i++) r += t[i] * e[1 + (i << 1)]
      return r
    }),
    (UZIP.F._codeTiny = function (e, t, r, i) {
      for (let o = 0; o < e.length; o += 2) {
        const a = e[o]
        const s = e[o + 1]
        i = UZIP.F._writeLit(a, t, r, i)
        const f = a == 16 ? 2 : a == 17 ? 3 : 7
        a > 15 && (UZIP.F._putsE(r, i, s, f), (i += f))
      }
      return i
    }),
    (UZIP.F._lenCodes = function (e, t) {
      for (var r = e.length; r != 2 && e[r - 1] == 0;) r -= 2
      for (let i = 0; i < r; i += 2) {
        const o = e[i + 1]
        const a = i + 3 < r ? e[i + 3] : -1
        const s = i + 5 < r ? e[i + 5] : -1
        const f = i == 0 ? -1 : e[i - 1]
        if (o == 0 && a == o && s == o) {
          for (var l = i + 5; l + 2 < r && e[l + 2] == o;) l += 2;
          ((c = Math.min((l + 1 - i) >>> 1, 138)) < 11
            ? t.push(17, c - 3)
            : t.push(18, c - 11),
          (i += 2 * c - 2))
        }
        else if (o == f && a == o && s == o) {
          for (l = i + 5; l + 2 < r && e[l + 2] == o;) l += 2
          var c = Math.min((l + 1 - i) >>> 1, 6);
          (t.push(16, c - 3), (i += 2 * c - 2))
        }
        else {
          t.push(o, 0)
        }
      }
      return r >>> 1
    }),
    (UZIP.F._hufTree = function (e, t, r) {
      const i = []
      const o = e.length
      const a = t.length
      let s = 0
      for (s = 0; s < a; s += 2) ((t[s] = 0), (t[s + 1] = 0))
      for (s = 0; s < o; s++) e[s] != 0 && i.push({ lit: s, f: e[s] })
      const f = i.length
      let l = i.slice(0)
      if (f == 0)
        return 0
      if (f == 1) {
        const c = i[0].lit
        l = c == 0 ? 1 : 0
        return ((t[1 + (c << 1)] = 1), (t[1 + (l << 1)] = 1), 1)
      }
      i.sort((e, t) => {
        return e.f - t.f
      })
      let u = i[0]
      let h = i[1]
      let d = 0
      let A = 1
      let g = 2
      for (i[0] = { lit: -1, f: u.f + h.f, l: u, r: h, d: 0 }; A != f - 1;) {
        ((u = d != A && (g == f || i[d].f < i[g].f) ? i[d++] : i[g++]),
        (h = d != A && (g == f || i[d].f < i[g].f) ? i[d++] : i[g++]),
        (i[A++] = { lit: -1, f: u.f + h.f, l: u, r: h }))
      }
      let p = UZIP.F.setDepth(i[A - 1], 0)
      for (
        p > r && (UZIP.F.restrictDepth(l, r, p), (p = r)), s = 0;
        s < f;
        s++
      )
        t[1 + (l[s].lit << 1)] = l[s].d
      return p
    }),
    (UZIP.F.setDepth = function (e, t) {
      return e.lit != -1
        ? ((e.d = t), t)
        : Math.max(UZIP.F.setDepth(e.l, t + 1), UZIP.F.setDepth(e.r, t + 1))
    }),
    (UZIP.F.restrictDepth = function (e, t, r) {
      let i = 0
      const o = 1 << (r - t)
      let a = 0
      for (
        e.sort((e, t) => {
          return t.d == e.d ? e.f - t.f : t.d - e.d
        }),
        i = 0;
        i < e.length && e[i].d > t;
        i++
      ) {
        var s = e[i].d;
        ((e[i].d = t), (a += o - (1 << (r - s))))
      }
      for (a >>>= r - t; a > 0;) {
        (s = e[i].d) < t ? (e[i].d++, (a -= 1 << (t - s - 1))) : i++
      }
      for (; i >= 0; i--) e[i].d == t && a < 0 && (e[i].d--, a++)
      a != 0 && console.log('debt left')
    }),
    (UZIP.F._goodIndex = function (e, t) {
      let r = 0
      return (
        t[16 | r] <= e && (r |= 16),
        t[8 | r] <= e && (r |= 8),
        t[4 | r] <= e && (r |= 4),
        t[2 | r] <= e && (r |= 2),
        t[1 | r] <= e && (r |= 1),
        r
      )
    }),
    (UZIP.F._writeLit = function (e, t, r, i) {
      return (UZIP.F._putsF(r, i, t[e << 1]), i + t[1 + (e << 1)])
    }),
    (UZIP.F.inflate = function (e, t) {
      const r = Uint8Array
      if (e[0] == 3 && e[1] == 0)
        return t || new r(0)
      const i = UZIP.F
      const o = i._bitsF
      const a = i._bitsE
      const s = i._decodeTiny
      const f = i.makeCodes
      const l = i.codes2map
      const c = i._get17
      const u = i.U
      const h = t == null
      h && (t = new r((e.length >>> 2) << 3))
      for (
        var d,
          A,
          g = 0,
          p = 0,
          m = 0,
          w = 0,
          v = 0,
          b = 0,
          y = 0,
          E = 0,
          F = 0;
        g == 0;

      ) {
        if (((g = o(e, F, 1)), (p = o(e, F + 1, 2)), (F += 3), p != 0)) {
          if (
            (h && (t = UZIP.F._check(t, E + (1 << 17))),
            p == 1 && ((d = u.flmap), (A = u.fdmap), (b = 511), (y = 31)),
            p == 2)
          ) {
            ((m = a(e, F, 5) + 257),
            (w = a(e, F + 5, 5) + 1),
            (v = a(e, F + 10, 4) + 4),
            (F += 14))
            for (var _ = 0; _ < 38; _ += 2)
              ((u.itree[_] = 0), (u.itree[_ + 1] = 0))
            let B = 1
            for (_ = 0; _ < v; _++) {
              const U = a(e, F + 3 * _, 3);
              ((u.itree[1 + (u.ordr[_] << 1)] = U), U > B && (B = U))
            }
            ((F += 3 * v),
            f(u.itree, B),
            l(u.itree, B, u.imap),
            (d = u.lmap),
            (A = u.dmap),
            (F = s(u.imap, (1 << B) - 1, m + w, e, F, u.ttree)))
            const C = i._copyOut(u.ttree, 0, m, u.ltree)
            b = (1 << C) - 1
            const I = i._copyOut(u.ttree, m, w, u.dtree);
            ((y = (1 << I) - 1),
            f(u.ltree, C),
            l(u.ltree, C, d),
            f(u.dtree, I),
            l(u.dtree, I, A))
          }
          for (;;) {
            const Q = d[c(e, F) & b]
            F += 15 & Q
            const M = Q >>> 4
            if (M >>> 8 == 0) {
              t[E++] = M
            }
            else {
              if (M == 256)
                break
              let x = E + M - 254
              if (M > 264) {
                const T = u.ldef[M - 257];
                ((x = E + (T >>> 3) + a(e, F, 7 & T)), (F += 7 & T))
              }
              const S = A[c(e, F) & y]
              F += 15 & S
              const R = S >>> 4
              const O = u.ddef[R]
              const P = (O >>> 4) + o(e, F, 15 & O)
              for (
                F += 15 & O, h && (t = UZIP.F._check(t, E + (1 << 17)));
                E < x;

              ) {
                ((t[E] = t[E++ - P]),
                (t[E] = t[E++ - P]),
                (t[E] = t[E++ - P]),
                (t[E] = t[E++ - P]))
              }
              E = x
            }
          }
        }
        else {
          (7 & F) != 0 && (F += 8 - (7 & F))
          const H = 4 + (F >>> 3)
          const L = e[H - 4] | (e[H - 3] << 8);
          (h && (t = UZIP.F._check(t, E + L)),
          t.set(new r(e.buffer, e.byteOffset + H, L), E),
          (F = (H + L) << 3),
          (E += L))
        }
      }
      return t.length == E ? t : t.slice(0, E)
    }),
    (UZIP.F._check = function (e, t) {
      const r = e.length
      if (t <= r)
        return e
      const i = new Uint8Array(Math.max(r << 1, t))
      return (i.set(e, 0), i)
    }),
    (UZIP.F._decodeTiny = function (e, t, r, i, o, a) {
      for (let s = UZIP.F._bitsE, f = UZIP.F._get17, l = 0; l < r;) {
        const c = e[f(i, o) & t]
        o += 15 & c
        const u = c >>> 4
        if (u <= 15) {
          ((a[l] = u), l++)
        }
        else {
          let h = 0
          let d = 0
          u == 16
            ? ((d = 3 + s(i, o, 2)), (o += 2), (h = a[l - 1]))
            : u == 17
              ? ((d = 3 + s(i, o, 3)), (o += 3))
              : u == 18 && ((d = 11 + s(i, o, 7)), (o += 7))
          for (let A = l + d; l < A;) ((a[l] = h), l++)
        }
      }
      return o
    }),
    (UZIP.F._copyOut = function (e, t, r, i) {
      for (var o = 0, a = 0, s = i.length >>> 1; a < r;) {
        const f = e[a + t];
        ((i[a << 1] = 0), (i[1 + (a << 1)] = f), f > o && (o = f), a++)
      }
      for (; a < s;) ((i[a << 1] = 0), (i[1 + (a << 1)] = 0), a++)
      return o
    }),
    (UZIP.F.makeCodes = function (e, t) {
      for (
        var r, i, o, a, s = UZIP.F.U, f = e.length, l = s.bl_count, c = 0;
        c <= t;
        c++
      )
        l[c] = 0
      for (c = 1; c < f; c += 2) l[e[c]]++
      const u = s.next_code
      for (r = 0, l[0] = 0, i = 1; i <= t; i++)
        ((r = (r + l[i - 1]) << 1), (u[i] = r))
      for (o = 0; o < f; o += 2)
        (a = e[o + 1]) != 0 && ((e[o] = u[a]), u[a]++)
    }),
    (UZIP.F.codes2map = function (e, t, r) {
      for (let i = e.length, o = UZIP.F.U.rev15, a = 0; a < i; a += 2) {
        if (e[a + 1] != 0) {
          for (
            let s = a >> 1,
              f = e[a + 1],
              l = (s << 4) | f,
              c = t - f,
              u = e[a] << c,
              h = u + (1 << c);
            u != h;

          ) {
            ((r[o[u] >>> (15 - t)] = l), u++)
          }
        }
      }
    }),
    (UZIP.F.revCodes = function (e, t) {
      for (let r = UZIP.F.U.rev15, i = 15 - t, o = 0; o < e.length; o += 2) {
        const a = e[o] << (t - e[o + 1])
        e[o] = r[a] >>> i
      }
    }),
    (UZIP.F._putsE = function (e, t, r) {
      r <<= 7 & t
      const i = t >>> 3;
      ((e[i] |= r), (e[i + 1] |= r >>> 8))
    }),
    (UZIP.F._putsF = function (e, t, r) {
      r <<= 7 & t
      const i = t >>> 3;
      ((e[i] |= r), (e[i + 1] |= r >>> 8), (e[i + 2] |= r >>> 16))
    }),
    (UZIP.F._bitsE = function (e, t, r) {
      return (
        ((e[t >>> 3] | (e[1 + (t >>> 3)] << 8)) >>> (7 & t)) & ((1 << r) - 1)
      )
    }),
    (UZIP.F._bitsF = function (e, t, r) {
      return (
        ((e[t >>> 3] | (e[1 + (t >>> 3)] << 8) | (e[2 + (t >>> 3)] << 16))
          >>> (7 & t))
        & ((1 << r) - 1)
      )
    }),
    (UZIP.F._get17 = function (e, t) {
      return (
        (e[t >>> 3] | (e[1 + (t >>> 3)] << 8) | (e[2 + (t >>> 3)] << 16))
        >>> (7 & t)
      )
    }),
    (UZIP.F._get25 = function (e, t) {
      return (
        (e[t >>> 3]
          | (e[1 + (t >>> 3)] << 8)
          | (e[2 + (t >>> 3)] << 16)
          | (e[3 + (t >>> 3)] << 24))
        >>> (7 & t)
      )
    }),
    (UZIP.F.U
      = ((t = Uint16Array),
      (r = Uint32Array),
      {
        next_code: new t(16),
        bl_count: new t(16),
        ordr: [
          16,
          17,
          18,
          0,
          8,
          7,
          9,
          6,
          10,
          5,
          11,
          4,
          12,
          3,
          13,
          2,
          14,
          1,
          15,
        ],
        of0: [
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          13,
          15,
          17,
          19,
          23,
          27,
          31,
          35,
          43,
          51,
          59,
          67,
          83,
          99,
          115,
          131,
          163,
          195,
          227,
          258,
          999,
          999,
          999,
        ],
        exb: [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          1,
          1,
          1,
          1,
          2,
          2,
          2,
          2,
          3,
          3,
          3,
          3,
          4,
          4,
          4,
          4,
          5,
          5,
          5,
          5,
          0,
          0,
          0,
          0,
        ],
        ldef: new t(32),
        df0: [
          1,
          2,
          3,
          4,
          5,
          7,
          9,
          13,
          17,
          25,
          33,
          49,
          65,
          97,
          129,
          193,
          257,
          385,
          513,
          769,
          1025,
          1537,
          2049,
          3073,
          4097,
          6145,
          8193,
          12289,
          16385,
          24577,
          65535,
          65535,
        ],
        dxb: [
          0,
          0,
          0,
          0,
          1,
          1,
          2,
          2,
          3,
          3,
          4,
          4,
          5,
          5,
          6,
          6,
          7,
          7,
          8,
          8,
          9,
          9,
          10,
          10,
          11,
          11,
          12,
          12,
          13,
          13,
          0,
          0,
        ],
        ddef: new r(32),
        flmap: new t(512),
        fltree: [],
        fdmap: new t(32),
        fdtree: [],
        lmap: new t(32768),
        ltree: [],
        ttree: [],
        dmap: new t(32768),
        dtree: [],
        imap: new t(512),
        itree: [],
        rev15: new t(32768),
        lhst: new r(286),
        dhst: new r(30),
        ihst: new r(19),
        lits: new r(15e3),
        strt: new t(65536),
        prev: new t(32768),
      })),
    (function () {
      for (var e = UZIP.F.U, t = 0; t < 32768; t++) {
        let r = t;
        ((r
          = ((4278255360
            & (r
              = ((4042322160
                & (r
                  = ((3435973836
                    & (r
                      = ((2863311530 & r) >>> 1) | ((1431655765 & r) << 1)))
                    >>> 2)
                  | ((858993459 & r) << 2)))
                  >>> 4)
                | ((252645135 & r) << 4)))
              >>> 8)
            | ((16711935 & r) << 8)),
        (e.rev15[t] = ((r >>> 16) | (r << 16)) >>> 17))
      }
      function pushV(e, t, r) {
        for (; t-- != 0;) e.push(0, r)
      }
      for (t = 0; t < 32; t++) {
        ((e.ldef[t] = (e.of0[t] << 3) | e.exb[t]),
        (e.ddef[t] = (e.df0[t] << 4) | e.dxb[t]))
      }
      (pushV(e.fltree, 144, 8),
      pushV(e.fltree, 112, 9),
      pushV(e.fltree, 24, 7),
      pushV(e.fltree, 8, 8),
      UZIP.F.makeCodes(e.fltree, 9),
      UZIP.F.codes2map(e.fltree, 9, e.flmap),
      UZIP.F.revCodes(e.fltree, 9),
      pushV(e.fdtree, 32, 5),
      UZIP.F.makeCodes(e.fdtree, 5),
      UZIP.F.codes2map(e.fdtree, 5, e.fdmap),
      UZIP.F.revCodes(e.fdtree, 5),
      pushV(e.itree, 19, 0),
      pushV(e.ltree, 286, 0),
      pushV(e.dtree, 30, 0),
      pushV(e.ttree, 320, 0))
    })())
  })({
    get exports() {
      return e
    },
    set exports(t) {
      e = t
    },
  })
  const UZIP = _mergeNamespaces({ __proto__: null, default: e }, [e])
  const UPNG = (function () {
    var e = {
      nextZero(e, t) {
        for (; e[t] != 0;) t++
        return t
      },
      readUshort: (e, t) => (e[t] << 8) | e[t + 1],
      writeUshort(e, t, r) {
        ((e[t] = (r >> 8) & 255), (e[t + 1] = 255 & r))
      },
      readUint: (e, t) =>
        16777216 * e[t] + ((e[t + 1] << 16) | (e[t + 2] << 8) | e[t + 3]),
      writeUint(e, t, r) {
        ((e[t] = (r >> 24) & 255),
        (e[t + 1] = (r >> 16) & 255),
        (e[t + 2] = (r >> 8) & 255),
        (e[t + 3] = 255 & r))
      },
      readASCII(e, t, r) {
        let i = ''
        for (let o = 0; o < r; o++) i += String.fromCharCode(e[t + o])
        return i
      },
      writeASCII(e, t, r) {
        for (let i = 0; i < r.length; i++) e[t + i] = r.charCodeAt(i)
      },
      readBytes(e, t, r) {
        const i = []
        for (let o = 0; o < r; o++) i.push(e[t + o])
        return i
      },
      pad: e => (e.length < 2 ? `0${e}` : e),
      readUTF8(t, r, i) {
        let o
        let a = ''
        for (let o = 0; o < i; o++) a += `%${e.pad(t[r + o].toString(16))}`
        try {
          o = decodeURIComponent(a)
        }
        catch (o) {
          return e.readASCII(t, r, i)
        }
        return o
      },
    }
    function decodeImage(t, r, i, o) {
      const a = r * i
      const s = _getBPP(o)
      const f = Math.ceil((r * s) / 8)
      const l = new Uint8Array(4 * a)
      const c = new Uint32Array(l.buffer)
      const { ctype: u } = o
      const { depth: h } = o
      const d = e.readUshort
      if (u == 6) {
        const e = a << 2
        if (h == 8) {
          for (var A = 0; A < e; A += 4) {
            ((l[A] = t[A]),
            (l[A + 1] = t[A + 1]),
            (l[A + 2] = t[A + 2]),
            (l[A + 3] = t[A + 3]))
          }
        }
        if (h == 16) {
          for (A = 0; A < e; A++) l[A] = t[A << 1]
        }
      }
      else if (u == 2) {
        const e = o.tabs.tRNS
        if (e == null) {
          if (h == 8) {
            for (A = 0; A < a; A++) {
              var g = 3 * A
              c[A] = (255 << 24) | (t[g + 2] << 16) | (t[g + 1] << 8) | t[g]
            }
          }
          if (h == 16) {
            for (A = 0; A < a; A++) {
              g = 6 * A
              c[A] = (255 << 24) | (t[g + 4] << 16) | (t[g + 2] << 8) | t[g]
            }
          }
        }
        else {
          var p = e[0]
          const r = e[1]
          const i = e[2]
          if (h == 8) {
            for (A = 0; A < a; A++) {
              var m = A << 2
              g = 3 * A;
              ((c[A] = (255 << 24) | (t[g + 2] << 16) | (t[g + 1] << 8) | t[g]),
              t[g] == p && t[g + 1] == r && t[g + 2] == i && (l[m + 3] = 0))
            }
          }
          if (h == 16) {
            for (A = 0; A < a; A++) {
              ((m = A << 2), (g = 6 * A));
              ((c[A] = (255 << 24) | (t[g + 4] << 16) | (t[g + 2] << 8) | t[g]),
              d(t, g) == p
              && d(t, g + 2) == r
              && d(t, g + 4) == i
              && (l[m + 3] = 0))
            }
          }
        }
      }
      else if (u == 3) {
        const e = o.tabs.PLTE
        const s = o.tabs.tRNS
        const c = s ? s.length : 0
        if (h == 1) {
          for (var w = 0; w < i; w++) {
            var v = w * f
            var b = w * r
            for (A = 0; A < r; A++) {
              m = (b + A) << 2
              var y = 3 * (E = (t[v + (A >> 3)] >> (7 - ((7 & A) << 0))) & 1);
              ((l[m] = e[y]),
              (l[m + 1] = e[y + 1]),
              (l[m + 2] = e[y + 2]),
              (l[m + 3] = E < c ? s[E] : 255))
            }
          }
        }
        if (h == 2) {
          for (w = 0; w < i; w++) {
            for (v = w * f, b = w * r, A = 0; A < r; A++) {
              ((m = (b + A) << 2),
              (y = 3 * (E = (t[v + (A >> 2)] >> (6 - ((3 & A) << 1))) & 3)));
              ((l[m] = e[y]),
              (l[m + 1] = e[y + 1]),
              (l[m + 2] = e[y + 2]),
              (l[m + 3] = E < c ? s[E] : 255))
            }
          }
        }
        if (h == 4) {
          for (w = 0; w < i; w++) {
            for (v = w * f, b = w * r, A = 0; A < r; A++) {
              ((m = (b + A) << 2),
              (y = 3 * (E = (t[v + (A >> 1)] >> (4 - ((1 & A) << 2))) & 15)));
              ((l[m] = e[y]),
              (l[m + 1] = e[y + 1]),
              (l[m + 2] = e[y + 2]),
              (l[m + 3] = E < c ? s[E] : 255))
            }
          }
        }
        if (h == 8) {
          for (A = 0; A < a; A++) {
            var E;
            ((m = A << 2), (y = 3 * (E = t[A])));
            ((l[m] = e[y]),
            (l[m + 1] = e[y + 1]),
            (l[m + 2] = e[y + 2]),
            (l[m + 3] = E < c ? s[E] : 255))
          }
        }
      }
      else if (u == 4) {
        if (h == 8) {
          for (A = 0; A < a; A++) {
            m = A << 2
            var F = t[(_ = A << 1)];
            ((l[m] = F), (l[m + 1] = F), (l[m + 2] = F), (l[m + 3] = t[_ + 1]))
          }
        }
        if (h == 16) {
          for (A = 0; A < a; A++) {
            var _;
            ((m = A << 2), (F = t[(_ = A << 2)]));
            ((l[m] = F), (l[m + 1] = F), (l[m + 2] = F), (l[m + 3] = t[_ + 2]))
          }
        }
      }
      else if (u == 0) {
        for (p = o.tabs.tRNS ? o.tabs.tRNS : -1, w = 0; w < i; w++) {
          const e = w * f
          const i = w * r
          if (h == 1) {
            for (var B = 0; B < r; B++) {
              var U
                = (F = 255 * ((t[e + (B >>> 3)] >>> (7 - (7 & B))) & 1))
                  == 255 * p
                  ? 0
                  : 255
              c[i + B] = (U << 24) | (F << 16) | (F << 8) | F
            }
          }
          else if (h == 2) {
            for (B = 0; B < r; B++) {
              U
                = (F = 85 * ((t[e + (B >>> 2)] >>> (6 - ((3 & B) << 1))) & 3))
                  == 85 * p
                  ? 0
                  : 255
              c[i + B] = (U << 24) | (F << 16) | (F << 8) | F
            }
          }
          else if (h == 4) {
            for (B = 0; B < r; B++) {
              U
                = (F = 17 * ((t[e + (B >>> 1)] >>> (4 - ((1 & B) << 2))) & 15))
                  == 17 * p
                  ? 0
                  : 255
              c[i + B] = (U << 24) | (F << 16) | (F << 8) | F
            }
          }
          else if (h == 8) {
            for (B = 0; B < r; B++) {
              U = (F = t[e + B]) == p ? 0 : 255
              c[i + B] = (U << 24) | (F << 16) | (F << 8) | F
            }
          }
          else if (h == 16) {
            for (B = 0; B < r; B++) {
              ((F = t[e + (B << 1)]), (U = d(t, e + (B << 1)) == p ? 0 : 255))
              c[i + B] = (U << 24) | (F << 16) | (F << 8) | F
            }
          }
        }
      }
      return l
    }
    function _decompress(e, r, i, o) {
      const a = _getBPP(e)
      const s = Math.ceil((i * a) / 8)
      const f = new Uint8Array((s + 1 + e.interlace) * o)
      return (
        (r = e.tabs.CgBI ? t(r, f) : _inflate(r, f)),
        e.interlace == 0
          ? (r = _filterZero(r, e, 0, i, o))
          : e.interlace == 1
            && (r = (function _readInterlace(e, t) {
              const r = t.width
              const i = t.height
              const o = _getBPP(t)
              const a = o >> 3
              const s = Math.ceil((r * o) / 8)
              const f = new Uint8Array(i * s)
              let l = 0
              const c = [0, 0, 4, 0, 2, 0, 1]
              const u = [0, 4, 0, 2, 0, 1, 0]
              const h = [8, 8, 8, 4, 4, 2, 2]
              const d = [8, 8, 4, 4, 2, 2, 1]
              let A = 0
              for (; A < 7;) {
                const p = h[A]
                const m = d[A]
                let w = 0
                let v = 0
                let b = c[A]
                for (; b < i;) ((b += p), v++)
                let y = u[A]
                for (; y < r;) ((y += m), w++)
                const E = Math.ceil((w * o) / 8)
                _filterZero(e, t, l, w, v)
                let F = 0
                let _ = c[A]
                for (; _ < i;) {
                  let t = u[A]
                  let i = (l + F * E) << 3
                  for (; t < r;) {
                    var g
                    if (o == 1) {
                      ((g = ((g = e[i >> 3]) >> (7 - (7 & i))) & 1),
                      (f[_ * s + (t >> 3)] |= g << (7 - ((7 & t) << 0))))
                    }
                    if (o == 2) {
                      ((g = ((g = e[i >> 3]) >> (6 - (7 & i))) & 3),
                      (f[_ * s + (t >> 2)] |= g << (6 - ((3 & t) << 1))))
                    }
                    if (o == 4) {
                      ((g = ((g = e[i >> 3]) >> (4 - (7 & i))) & 15),
                      (f[_ * s + (t >> 1)] |= g << (4 - ((1 & t) << 2))))
                    }
                    if (o >= 8) {
                      const r = _ * s + t * a
                      for (let t = 0; t < a; t++) f[r + t] = e[(i >> 3) + t]
                    }
                    ((i += o), (t += m))
                  }
                  (F++, (_ += p))
                }
                (w * v != 0 && (l += v * (1 + E)), (A += 1))
              }
              return f
            })(r, e)),
        r
      )
    }
    function _inflate(e, r) {
      return t(new Uint8Array(e.buffer, 2, e.length - 6), r)
    }
    var t = (function () {
      const e = { H: {} }
      return (
        (e.H.N = function (t, r) {
          const i = Uint8Array
          let o
          let a
          let s = 0
          let f = 0
          let l = 0
          let c = 0
          let u = 0
          let h = 0
          let d = 0
          let A = 0
          let g = 0
          if (t[0] == 3 && t[1] == 0)
            return r || new i(0)
          const p = e.H
          const m = p.b
          const w = p.e
          const v = p.R
          const b = p.n
          const y = p.A
          const E = p.Z
          const F = p.m
          const _ = r == null
          for (_ && (r = new i((t.length >>> 2) << 5)); s == 0;) {
            if (((s = m(t, g, 1)), (f = m(t, g + 1, 2)), (g += 3), f != 0)) {
              if (
                (_ && (r = e.H.W(r, A + (1 << 17))),
                f == 1 && ((o = F.J), (a = F.h), (h = 511), (d = 31)),
                f == 2)
              ) {
                ((l = w(t, g, 5) + 257),
                (c = w(t, g + 5, 5) + 1),
                (u = w(t, g + 10, 4) + 4),
                (g += 14))
                let e = 1
                for (var B = 0; B < 38; B += 2)
                  ((F.Q[B] = 0), (F.Q[B + 1] = 0))
                for (B = 0; B < u; B++) {
                  const r = w(t, g + 3 * B, 3);
                  ((F.Q[1 + (F.X[B] << 1)] = r), r > e && (e = r))
                }
                ((g += 3 * u),
                b(F.Q, e),
                y(F.Q, e, F.u),
                (o = F.w),
                (a = F.d),
                (g = v(F.u, (1 << e) - 1, l + c, t, g, F.v)))
                const r = p.V(F.v, 0, l, F.C)
                h = (1 << r) - 1
                const i = p.V(F.v, l, c, F.D);
                ((d = (1 << i) - 1),
                b(F.C, r),
                y(F.C, r, o),
                b(F.D, i),
                y(F.D, i, a))
              }
              for (;;) {
                const e = o[E(t, g) & h]
                g += 15 & e
                const i = e >>> 4
                if (i >>> 8 == 0) {
                  r[A++] = i
                }
                else {
                  if (i == 256)
                    break
                  {
                    let e = A + i - 254
                    if (i > 264) {
                      const r = F.q[i - 257];
                      ((e = A + (r >>> 3) + w(t, g, 7 & r)), (g += 7 & r))
                    }
                    const o = a[E(t, g) & d]
                    g += 15 & o
                    const s = o >>> 4
                    const f = F.c[s]
                    const l = (f >>> 4) + m(t, g, 15 & f)
                    for (g += 15 & f; A < e;) {
                      ((r[A] = r[A++ - l]),
                      (r[A] = r[A++ - l]),
                      (r[A] = r[A++ - l]),
                      (r[A] = r[A++ - l]))
                    }
                    A = e
                  }
                }
              }
            }
            else {
              (7 & g) != 0 && (g += 8 - (7 & g))
              const o = 4 + (g >>> 3)
              const a = t[o - 4] | (t[o - 3] << 8);
              (_ && (r = e.H.W(r, A + a)),
              r.set(new i(t.buffer, t.byteOffset + o, a), A),
              (g = (o + a) << 3),
              (A += a))
            }
          }
          return r.length == A ? r : r.slice(0, A)
        }),
        (e.H.W = function (e, t) {
          const r = e.length
          if (t <= r)
            return e
          const i = new Uint8Array(r << 1)
          return (i.set(e, 0), i)
        }),
        (e.H.R = function (t, r, i, o, a, s) {
          const f = e.H.e
          const l = e.H.Z
          let c = 0
          for (; c < i;) {
            const e = t[l(o, a) & r]
            a += 15 & e
            const i = e >>> 4
            if (i <= 15) {
              ((s[c] = i), c++)
            }
            else {
              let e = 0
              let t = 0
              i == 16
                ? ((t = 3 + f(o, a, 2)), (a += 2), (e = s[c - 1]))
                : i == 17
                  ? ((t = 3 + f(o, a, 3)), (a += 3))
                  : i == 18 && ((t = 11 + f(o, a, 7)), (a += 7))
              const r = c + t
              for (; c < r;) ((s[c] = e), c++)
            }
          }
          return a
        }),
        (e.H.V = function (e, t, r, i) {
          let o = 0
          let a = 0
          const s = i.length >>> 1
          for (; a < r;) {
            const r = e[a + t];
            ((i[a << 1] = 0), (i[1 + (a << 1)] = r), r > o && (o = r), a++)
          }
          for (; a < s;) ((i[a << 1] = 0), (i[1 + (a << 1)] = 0), a++)
          return o
        }),
        (e.H.n = function (t, r) {
          const i = e.H.m
          const o = t.length
          let a, s, f
          let l
          const c = i.j
          for (var u = 0; u <= r; u++) c[u] = 0
          for (u = 1; u < o; u += 2) c[t[u]]++
          const h = i.K
          for (a = 0, c[0] = 0, s = 1; s <= r; s++)
            ((a = (a + c[s - 1]) << 1), (h[s] = a))
          for (f = 0; f < o; f += 2)
            ((l = t[f + 1]), l != 0 && ((t[f] = h[l]), h[l]++))
        }),
        (e.H.A = function (t, r, i) {
          const o = t.length
          const a = e.H.m.r
          for (let e = 0; e < o; e += 2) {
            if (t[e + 1] != 0) {
              const o = e >> 1
              const s = t[e + 1]
              const f = (o << 4) | s
              const l = r - s
              let c = t[e] << l
              const u = c + (1 << l)
              for (; c != u;) {
                ((i[a[c] >>> (15 - r)] = f), c++)
              }
            }
          }
        }),
        (e.H.l = function (t, r) {
          const i = e.H.m.r
          const o = 15 - r
          for (let e = 0; e < t.length; e += 2) {
            const a = t[e] << (r - t[e + 1])
            t[e] = i[a] >>> o
          }
        }),
        (e.H.M = function (e, t, r) {
          r <<= 7 & t
          const i = t >>> 3;
          ((e[i] |= r), (e[i + 1] |= r >>> 8))
        }),
        (e.H.I = function (e, t, r) {
          r <<= 7 & t
          const i = t >>> 3;
          ((e[i] |= r), (e[i + 1] |= r >>> 8), (e[i + 2] |= r >>> 16))
        }),
        (e.H.e = function (e, t, r) {
          return (
            ((e[t >>> 3] | (e[1 + (t >>> 3)] << 8)) >>> (7 & t))
            & ((1 << r) - 1)
          )
        }),
        (e.H.b = function (e, t, r) {
          return (
            ((e[t >>> 3]
              | (e[1 + (t >>> 3)] << 8)
              | (e[2 + (t >>> 3)] << 16))
            >>> (7 & t))
          & ((1 << r) - 1)
          )
        }),
        (e.H.Z = function (e, t) {
          return (
            (e[t >>> 3]
              | (e[1 + (t >>> 3)] << 8)
              | (e[2 + (t >>> 3)] << 16))
            >>> (7 & t)
          )
        }),
        (e.H.i = function (e, t) {
          return (
            (e[t >>> 3]
              | (e[1 + (t >>> 3)] << 8)
              | (e[2 + (t >>> 3)] << 16)
              | (e[3 + (t >>> 3)] << 24))
            >>> (7 & t)
          )
        }),
        (e.H.m = (function () {
          const e = Uint16Array
          const t = Uint32Array
          return {
            K: new e(16),
            j: new e(16),
            X: [
              16,
              17,
              18,
              0,
              8,
              7,
              9,
              6,
              10,
              5,
              11,
              4,
              12,
              3,
              13,
              2,
              14,
              1,
              15,
            ],
            S: [
              3,
              4,
              5,
              6,
              7,
              8,
              9,
              10,
              11,
              13,
              15,
              17,
              19,
              23,
              27,
              31,
              35,
              43,
              51,
              59,
              67,
              83,
              99,
              115,
              131,
              163,
              195,
              227,
              258,
              999,
              999,
              999,
            ],
            T: [
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              0,
              1,
              1,
              1,
              1,
              2,
              2,
              2,
              2,
              3,
              3,
              3,
              3,
              4,
              4,
              4,
              4,
              5,
              5,
              5,
              5,
              0,
              0,
              0,
              0,
            ],
            q: new e(32),
            p: [
              1,
              2,
              3,
              4,
              5,
              7,
              9,
              13,
              17,
              25,
              33,
              49,
              65,
              97,
              129,
              193,
              257,
              385,
              513,
              769,
              1025,
              1537,
              2049,
              3073,
              4097,
              6145,
              8193,
              12289,
              16385,
              24577,
              65535,
              65535,
            ],
            z: [
              0,
              0,
              0,
              0,
              1,
              1,
              2,
              2,
              3,
              3,
              4,
              4,
              5,
              5,
              6,
              6,
              7,
              7,
              8,
              8,
              9,
              9,
              10,
              10,
              11,
              11,
              12,
              12,
              13,
              13,
              0,
              0,
            ],
            c: new t(32),
            J: new e(512),
            _: [],
            h: new e(32),
            $: [],
            w: new e(32768),
            C: [],
            v: [],
            d: new e(32768),
            D: [],
            u: new e(512),
            Q: [],
            r: new e(32768),
            s: new t(286),
            Y: new t(30),
            a: new t(19),
            t: new t(15e3),
            k: new e(65536),
            g: new e(32768),
          }
        })()),
        (function () {
          const t = e.H.m
          for (var r = 0; r < 32768; r++) {
            let e = r;
            ((e = ((2863311530 & e) >>> 1) | ((1431655765 & e) << 1)),
            (e = ((3435973836 & e) >>> 2) | ((858993459 & e) << 2)),
            (e = ((4042322160 & e) >>> 4) | ((252645135 & e) << 4)),
            (e = ((4278255360 & e) >>> 8) | ((16711935 & e) << 8)),
            (t.r[r] = ((e >>> 16) | (e << 16)) >>> 17))
          }
          function n(e, t, r) {
            for (; t-- != 0;) e.push(0, r)
          }
          for (r = 0; r < 32; r++) {
            ((t.q[r] = (t.S[r] << 3) | t.T[r]),
            (t.c[r] = (t.p[r] << 4) | t.z[r]))
          }
          (n(t._, 144, 8),
          n(t._, 112, 9),
          n(t._, 24, 7),
          n(t._, 8, 8),
          e.H.n(t._, 9),
          e.H.A(t._, 9, t.J),
          e.H.l(t._, 9),
          n(t.$, 32, 5),
          e.H.n(t.$, 5),
          e.H.A(t.$, 5, t.h),
          e.H.l(t.$, 5),
          n(t.Q, 19, 0),
          n(t.C, 286, 0),
          n(t.D, 30, 0),
          n(t.v, 320, 0))
        })(),
        e.H.N
      )
    })()
    function _getBPP(e) {
      return [1, null, 3, 1, 2, null, 4][e.ctype] * e.depth
    }
    function _filterZero(e, t, r, i, o) {
      let a = _getBPP(t)
      const s = Math.ceil((i * a) / 8)
      let f, l
      a = Math.ceil(a / 8)
      let c = e[r]
      let u = 0
      if ((c > 1 && (e[r] = [0, 0, 1][c - 2]), c == 3)) {
        for (u = a; u < s; u++)
          e[u + 1] = (e[u + 1] + (e[u + 1 - a] >>> 1)) & 255
      }
      for (let t = 0; t < o; t++) {
        if (((f = r + t * s), (l = f + t + 1), (c = e[l - 1]), (u = 0), c == 0)) {
          for (; u < s; u++) e[f + u] = e[l + u]
        }
        else if (c == 1) {
          for (; u < a; u++) e[f + u] = e[l + u]
          for (; u < s; u++) e[f + u] = e[l + u] + e[f + u - a]
        }
        else if (c == 2) {
          for (; u < s; u++) e[f + u] = e[l + u] + e[f + u - s]
        }
        else if (c == 3) {
          for (; u < a; u++) e[f + u] = e[l + u] + (e[f + u - s] >>> 1)
          for (; u < s; u++)
            e[f + u] = e[l + u] + ((e[f + u - s] + e[f + u - a]) >>> 1)
        }
        else {
          for (; u < a; u++) e[f + u] = e[l + u] + _paeth(0, e[f + u - s], 0)
          for (; u < s; u++) {
            e[f + u]
              = e[l + u] + _paeth(e[f + u - a], e[f + u - s], e[f + u - a - s])
          }
        }
      }
      return e
    }
    function _paeth(e, t, r) {
      const i = e + t - r
      const o = i - e
      const a = i - t
      const s = i - r
      return o * o <= a * a && o * o <= s * s ? e : a * a <= s * s ? t : r
    }
    function _IHDR(t, r, i) {
      ((i.width = e.readUint(t, r)),
      (r += 4),
      (i.height = e.readUint(t, r)),
      (r += 4),
      (i.depth = t[r]),
      r++,
      (i.ctype = t[r]),
      r++,
      (i.compress = t[r]),
      r++,
      (i.filter = t[r]),
      r++,
      (i.interlace = t[r]),
      r++)
    }
    function _copyTile(e, t, r, i, o, a, s, f, l) {
      const c = Math.min(t, o)
      const u = Math.min(r, a)
      let h = 0
      let d = 0
      for (let r = 0; r < u; r++) {
        for (let a = 0; a < c; a++) {
          if (
            (s >= 0 && f >= 0
              ? ((h = (r * t + a) << 2), (d = ((f + r) * o + s + a) << 2))
              : ((h = ((-f + r) * t - s + a) << 2), (d = (r * o + a) << 2)),
            l == 0)
          ) {
            ((i[d] = e[h]),
            (i[d + 1] = e[h + 1]),
            (i[d + 2] = e[h + 2]),
            (i[d + 3] = e[h + 3]))
          }
          else if (l == 1) {
            var A = e[h + 3] * (1 / 255)
            var g = e[h] * A
            var p = e[h + 1] * A
            var m = e[h + 2] * A
            var w = i[d + 3] * (1 / 255)
            var v = i[d] * w
            var b = i[d + 1] * w
            var y = i[d + 2] * w
            const t = 1 - A
            const r = A + w * t
            const o = r == 0 ? 0 : 1 / r;
            ((i[d + 3] = 255 * r),
            (i[d + 0] = (g + v * t) * o),
            (i[d + 1] = (p + b * t) * o),
            (i[d + 2] = (m + y * t) * o))
          }
          else if (l == 2) {
            ((A = e[h + 3]),
            (g = e[h]),
            (p = e[h + 1]),
            (m = e[h + 2]),
            (w = i[d + 3]),
            (v = i[d]),
            (b = i[d + 1]),
            (y = i[d + 2]))
            A == w && g == v && p == b && m == y
              ? ((i[d] = 0), (i[d + 1] = 0), (i[d + 2] = 0), (i[d + 3] = 0))
              : ((i[d] = g), (i[d + 1] = p), (i[d + 2] = m), (i[d + 3] = A))
          }
          else if (l == 3) {
            ((A = e[h + 3]),
            (g = e[h]),
            (p = e[h + 1]),
            (m = e[h + 2]),
            (w = i[d + 3]),
            (v = i[d]),
            (b = i[d + 1]),
            (y = i[d + 2]))
            if (A == w && g == v && p == b && m == y)
              continue
            if (A < 220 && w > 20)
              return !1
          }
        }
      }
      return !0
    }
    return {
      decode: function decode(r) {
        const i = new Uint8Array(r)
        let o = 8
        const a = e
        const s = a.readUshort
        const f = a.readUint
        const l = { tabs: {}, frames: [] }
        const c = new Uint8Array(i.length)
        let u
        let h = 0
        let d = 0
        const A = [137, 80, 78, 71, 13, 10, 26, 10]
        for (var g = 0; g < 8; g++) {
          if (i[g] != A[g])
            throw 'The input is not a PNG file!'
        }
        for (; o < i.length;) {
          const e = a.readUint(i, o)
          o += 4
          const r = a.readASCII(i, o, 4)
          if (((o += 4), r == 'IHDR')) {
            _IHDR(i, o, l)
          }
          else if (r == 'iCCP') {
            for (var p = o; i[p] != 0;) p++;
            (a.readASCII(i, o, p - o), i[p + 1])
            const s = i.slice(p + 2, o + e)
            let f = null
            try {
              f = _inflate(s)
            }
            catch (e) {
              f = t(s)
            }
            l.tabs[r] = f
          }
          else if (r == 'CgBI') {
            l.tabs[r] = i.slice(o, o + 4)
          }
          else if (r == 'IDAT') {
            for (g = 0; g < e; g++) c[h + g] = i[o + g]
            h += e
          }
          else if (r == 'acTL') {
            ((l.tabs[r] = { num_frames: f(i, o), num_plays: f(i, o + 4) }),
            (u = new Uint8Array(i.length)))
          }
          else if (r == 'fcTL') {
            if (d != 0) {
              (((E = l.frames[l.frames.length - 1]).data = _decompress(
                l,
                u.slice(0, d),
                E.rect.width,
                E.rect.height,
              )),
              (d = 0))
            }
            const e = {
              x: f(i, o + 12),
              y: f(i, o + 16),
              width: f(i, o + 4),
              height: f(i, o + 8),
            }
            let t = s(i, o + 22)
            t = s(i, o + 20) / (t == 0 ? 100 : t)
            const r = {
              rect: e,
              delay: Math.round(1e3 * t),
              dispose: i[o + 24],
              blend: i[o + 25],
            }
            l.frames.push(r)
          }
          else if (r == 'fdAT') {
            for (g = 0; g < e - 4; g++) u[d + g] = i[o + g + 4]
            d += e - 4
          }
          else if (r == 'pHYs') {
            l.tabs[r] = [a.readUint(i, o), a.readUint(i, o + 4), i[o + 8]]
          }
          else if (r == 'cHRM') {
            l.tabs[r] = []
            for (g = 0; g < 8; g++) l.tabs[r].push(a.readUint(i, o + 4 * g))
          }
          else if (r == 'tEXt' || r == 'zTXt') {
            l.tabs[r] == null && (l.tabs[r] = {})
            var m = a.nextZero(i, o)
            var w = a.readASCII(i, o, m - o)
            var v = o + e - m - 1
            if (r == 'tEXt') {
              y = a.readASCII(i, m + 1, v)
            }
            else {
              var b = _inflate(i.slice(m + 2, m + 2 + v))
              y = a.readUTF8(b, 0, b.length)
            }
            l.tabs[r][w] = y
          }
          else if (r == 'iTXt') {
            l.tabs[r] == null && (l.tabs[r] = {});
            ((m = 0), (p = o))
            m = a.nextZero(i, p)
            w = a.readASCII(i, p, m - p)
            const t = i[(p = m + 1)]
            var y;
            (i[p + 1],
            (p += 2),
            (m = a.nextZero(i, p)),
            a.readASCII(i, p, m - p),
            (p = m + 1),
            (m = a.nextZero(i, p)),
            a.readUTF8(i, p, m - p))
            v = e - ((p = m + 1) - o)
            if (t == 0) {
              y = a.readUTF8(i, p, v)
            }
            else {
              b = _inflate(i.slice(p, p + v))
              y = a.readUTF8(b, 0, b.length)
            }
            l.tabs[r][w] = y
          }
          else if (r == 'PLTE') {
            l.tabs[r] = a.readBytes(i, o, e)
          }
          else if (r == 'hIST') {
            const e = l.tabs.PLTE.length / 3
            l.tabs[r] = []
            for (g = 0; g < e; g++) l.tabs[r].push(s(i, o + 2 * g))
          }
          else if (r == 'tRNS') {
            l.ctype == 3
              ? (l.tabs[r] = a.readBytes(i, o, e))
              : l.ctype == 0
                ? (l.tabs[r] = s(i, o))
                : l.ctype == 2
                  && (l.tabs[r] = [s(i, o), s(i, o + 2), s(i, o + 4)])
          }
          else if (r == 'gAMA') {
            l.tabs[r] = a.readUint(i, o) / 1e5
          }
          else if (r == 'sRGB') {
            l.tabs[r] = i[o]
          }
          else if (r == 'bKGD') {
            l.ctype == 0 || l.ctype == 4
              ? (l.tabs[r] = [s(i, o)])
              : l.ctype == 2 || l.ctype == 6
                ? (l.tabs[r] = [s(i, o), s(i, o + 2), s(i, o + 4)])
                : l.ctype == 3 && (l.tabs[r] = i[o])
          }
          else if (r == 'IEND') {
            break
          }
          ((o += e), a.readUint(i, o), (o += 4))
        }
        let E
        return (
          d != 0
          && ((E = l.frames[l.frames.length - 1]).data = _decompress(
            l,
            u.slice(0, d),
            E.rect.width,
            E.rect.height,
          )),
          (l.data = _decompress(l, c, l.width, l.height)),
          delete l.compress,
          delete l.interlace,
          delete l.filter,
          l
        )
      },
      toRGBA8: function toRGBA8(e) {
        const t = e.width
        const r = e.height
        if (e.tabs.acTL == null)
          return [decodeImage(e.data, t, r, e).buffer]
        const i = []
        e.frames[0].data == null && (e.frames[0].data = e.data)
        const o = t * r * 4
        const a = new Uint8Array(o)
        const s = new Uint8Array(o)
        const f = new Uint8Array(o)
        for (let c = 0; c < e.frames.length; c++) {
          const u = e.frames[c]
          const h = u.rect.x
          const d = u.rect.y
          const A = u.rect.width
          const g = u.rect.height
          const p = decodeImage(u.data, A, g, e)
          if (c != 0) {
            for (var l = 0; l < o; l++) f[l] = a[l]
          }
          if (
            (u.blend == 0
              ? _copyTile(p, A, g, a, t, r, h, d, 0)
              : u.blend == 1 && _copyTile(p, A, g, a, t, r, h, d, 1),
            i.push(a.buffer.slice(0)),
            u.dispose == 0)
          ) {
            ;
          }
          else if (u.dispose == 1) {
            _copyTile(s, A, g, a, t, r, h, d, 0)
          }
          else if (u.dispose == 2) {
            for (l = 0; l < o; l++) a[l] = f[l]
          }
        }
        return i
      },
      _paeth,
      _copyTile,
      _bin: e,
    }
  })()
  !(function () {
    const { _copyTile: e } = UPNG
    const { _bin: t } = UPNG
    const r = UPNG._paeth
    var i = {
      table: (function () {
        const e = new Uint32Array(256)
        for (let t = 0; t < 256; t++) {
          let r = t
          for (let e = 0; e < 8; e++)
            1 & r ? (r = 3988292384 ^ (r >>> 1)) : (r >>>= 1)
          e[t] = r
        }
        return e
      })(),
      update(e, t, r, o) {
        for (let a = 0; a < o; a++)
          e = i.table[255 & (e ^ t[r + a])] ^ (e >>> 8)
        return e
      },
      crc: (e, t, r) => 4294967295 ^ i.update(4294967295, e, t, r),
    }
    function addErr(e, t, r, i) {
      ((t[r] += (e[0] * i) >> 4),
      (t[r + 1] += (e[1] * i) >> 4),
      (t[r + 2] += (e[2] * i) >> 4),
      (t[r + 3] += (e[3] * i) >> 4))
    }
    function N(e) {
      return Math.max(0, Math.min(255, e))
    }
    function D(e, t) {
      const r = e[0] - t[0]
      const i = e[1] - t[1]
      const o = e[2] - t[2]
      const a = e[3] - t[3]
      return r * r + i * i + o * o + a * a
    }
    function dither(e, t, r, i, o, a, s) {
      s == null && (s = 1)
      const f = i.length
      const l = []
      for (var c = 0; c < f; c++) {
        const e = i[c]
        l.push([
          (e >>> 0) & 255,
          (e >>> 8) & 255,
          (e >>> 16) & 255,
          (e >>> 24) & 255,
        ])
      }
      for (c = 0; c < f; c++) {
        let e = 4294967295
        for (var u = 0, h = 0; h < f; h++) {
          var d = D(l[c], l[h])
          h != c && d < e && ((e = d), (u = h))
        }
      }
      const A = new Uint32Array(o.buffer)
      const g = new Int16Array(t * r * 4)
      const p = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
      for (c = 0; c < p.length; c++) p[c] = 255 * ((p[c] + 0.5) / 16 - 0.5)
      for (let o = 0; o < r; o++) {
        for (let w = 0; w < t; w++) {
          var m
          c = 4 * (o * t + w)
          if (s != 2) {
            m = [
              N(e[c] + g[c]),
              N(e[c + 1] + g[c + 1]),
              N(e[c + 2] + g[c + 2]),
              N(e[c + 3] + g[c + 3]),
            ]
          }
          else {
            d = p[4 * (3 & o) + (3 & w)]
            m = [
              N(e[c] + d),
              N(e[c + 1] + d),
              N(e[c + 2] + d),
              N(e[c + 3] + d),
            ]
          }
          u = 0
          let v = 16777215
          for (h = 0; h < f; h++) {
            const e = D(m, l[h])
            e < v && ((v = e), (u = h))
          }
          const b = l[u]
          const y = [m[0] - b[0], m[1] - b[1], m[2] - b[2], m[3] - b[3]];
          (s == 1
            && (w != t - 1 && addErr(y, g, c + 4, 7),
            o != r - 1
            && (w != 0 && addErr(y, g, c + 4 * t - 4, 3),
            addErr(y, g, c + 4 * t, 5),
            w != t - 1 && addErr(y, g, c + 4 * t + 4, 1))),
          (a[c >> 2] = u),
          (A[c >> 2] = i[u]))
        }
      }
    }
    function _main(e, r, o, a, s) {
      s == null && (s = {})
      const { crc: f } = i
      const l = t.writeUint
      const c = t.writeUshort
      const u = t.writeASCII
      let h = 8
      const d = e.frames.length > 1
      let A
      let g = !1
      let p = 33 + (d ? 20 : 0)
      if (
        (s.sRGB != null && (p += 13),
        s.pHYs != null && (p += 21),
        s.iCCP != null
        && ((A = pako.deflate(s.iCCP)), (p += 21 + A.length + 4)),
        e.ctype == 3)
      ) {
        for (var m = e.plte.length, w = 0; w < m; w++)
          e.plte[w] >>> 24 != 255 && (g = !0)
        p += 8 + 3 * m + 4 + (g ? 8 + 1 * m + 4 : 0)
      }
      for (var v = 0; v < e.frames.length; v++) {
        (d && (p += 38),
        (p += (F = e.frames[v]).cimg.length + 12),
        v != 0 && (p += 4))
      }
      p += 12
      const b = new Uint8Array(p)
      const y = [137, 80, 78, 71, 13, 10, 26, 10]
      for (w = 0; w < 8; w++) b[w] = y[w]
      if (
        (l(b, h, 13),
        (h += 4),
        u(b, h, 'IHDR'),
        (h += 4),
        l(b, h, r),
        (h += 4),
        l(b, h, o),
        (h += 4),
        (b[h] = e.depth),
        h++,
        (b[h] = e.ctype),
        h++,
        (b[h] = 0),
        h++,
        (b[h] = 0),
        h++,
        (b[h] = 0),
        h++,
        l(b, h, f(b, h - 17, 17)),
        (h += 4),
        s.sRGB != null
        && (l(b, h, 1),
        (h += 4),
        u(b, h, 'sRGB'),
        (h += 4),
        (b[h] = s.sRGB),
        h++,
        l(b, h, f(b, h - 5, 5)),
        (h += 4)),
        s.iCCP != null)
      ) {
        const e = 13 + A.length;
        (l(b, h, e),
        (h += 4),
        u(b, h, 'iCCP'),
        (h += 4),
        u(b, h, 'ICC profile'),
        (h += 11),
        (h += 2),
        b.set(A, h),
        (h += A.length),
        l(b, h, f(b, h - (e + 4), e + 4)),
        (h += 4))
      }
      if (
        (s.pHYs != null
          && (l(b, h, 9),
          (h += 4),
          u(b, h, 'pHYs'),
          (h += 4),
          l(b, h, s.pHYs[0]),
          (h += 4),
          l(b, h, s.pHYs[1]),
          (h += 4),
          (b[h] = s.pHYs[2]),
          h++,
          l(b, h, f(b, h - 13, 13)),
          (h += 4)),
        d
        && (l(b, h, 8),
        (h += 4),
        u(b, h, 'acTL'),
        (h += 4),
        l(b, h, e.frames.length),
        (h += 4),
        l(b, h, s.loop != null ? s.loop : 0),
        (h += 4),
        l(b, h, f(b, h - 12, 12)),
        (h += 4)),
        e.ctype == 3)
      ) {
        (l(b, h, 3 * (m = e.plte.length)), (h += 4), u(b, h, 'PLTE'), (h += 4))
        for (w = 0; w < m; w++) {
          const t = 3 * w
          const r = e.plte[w]
          const i = 255 & r
          const o = (r >>> 8) & 255
          const a = (r >>> 16) & 255;
          ((b[h + t + 0] = i), (b[h + t + 1] = o), (b[h + t + 2] = a))
        }
        if (
          ((h += 3 * m), l(b, h, f(b, h - 3 * m - 4, 3 * m + 4)), (h += 4), g)
        ) {
          (l(b, h, m), (h += 4), u(b, h, 'tRNS'), (h += 4))
          for (w = 0; w < m; w++) b[h + w] = (e.plte[w] >>> 24) & 255;
          ((h += m), l(b, h, f(b, h - m - 4, m + 4)), (h += 4))
        }
      }
      let E = 0
      for (v = 0; v < e.frames.length; v++) {
        var F = e.frames[v]
        d
        && (l(b, h, 26),
        (h += 4),
        u(b, h, 'fcTL'),
        (h += 4),
        l(b, h, E++),
        (h += 4),
        l(b, h, F.rect.width),
        (h += 4),
        l(b, h, F.rect.height),
        (h += 4),
        l(b, h, F.rect.x),
        (h += 4),
        l(b, h, F.rect.y),
        (h += 4),
        c(b, h, a[v]),
        (h += 2),
        c(b, h, 1e3),
        (h += 2),
        (b[h] = F.dispose),
        h++,
        (b[h] = F.blend),
        h++,
        l(b, h, f(b, h - 30, 30)),
        (h += 4))
        const t = F.cimg;
        (l(b, h, (m = t.length) + (v == 0 ? 0 : 4)), (h += 4))
        const r = h;
        (u(b, h, v == 0 ? 'IDAT' : 'fdAT'),
        (h += 4),
        v != 0 && (l(b, h, E++), (h += 4)),
        b.set(t, h),
        (h += m),
        l(b, h, f(b, r, h - r)),
        (h += 4))
      }
      return (
        l(b, h, 0),
        (h += 4),
        u(b, h, 'IEND'),
        (h += 4),
        l(b, h, f(b, h - 4, 4)),
        (h += 4),
        b.buffer
      )
    }
    function compressPNG(e, t, r) {
      for (let i = 0; i < e.frames.length; i++) {
        const o = e.frames[i]
        o.rect.width
        const a = o.rect.height
        const s = new Uint8Array(a * o.bpl + a)
        o.cimg = _filterZero(o.img, a, o.bpp, o.bpl, s, t, r)
      }
    }
    function compress(t, r, i, o, a) {
      const s = a[0]
      const f = a[1]
      const l = a[2]
      const c = a[3]
      const u = a[4]
      const h = a[5]
      let d = 6
      let A = 8
      let g = 255
      for (var p = 0; p < t.length; p++) {
        const e = new Uint8Array(t[p])
        for (var m = e.length, w = 0; w < m; w += 4) g &= e[w + 3]
      }
      const v = g != 255
      const b = (function framize(t, r, i, o, a, s) {
        const f = []
        for (var l = 0; l < t.length; l++) {
          const h = new Uint8Array(t[l])
          const A = new Uint32Array(h.buffer)
          var c
          let g = 0
          let p = 0
          let m = r
          let w = i
          let v = o ? 1 : 0
          if (l != 0) {
            const b = s || o || l == 1 || f[l - 2].dispose != 0 ? 1 : 2
            let y = 0
            let E = 1e9
            for (let e = 0; e < b; e++) {
              var u = new Uint8Array(t[l - 1 - e])
              const o = new Uint32Array(t[l - 1 - e])
              let s = r
              let f = i
              let c = -1
              let h = -1
              for (let e = 0; e < i; e++) {
                for (let t = 0; t < r; t++) {
                  A[(d = e * r + t)] != o[d]
                  && (t < s && (s = t),
                  t > c && (c = t),
                  e < f && (f = e),
                  e > h && (h = e))
                }
              }
              (c == -1 && (s = f = c = h = 0),
              a && ((1 & s) == 1 && s--, (1 & f) == 1 && f--))
              const v = (c - s + 1) * (h - f + 1)
              v < E
              && ((E = v),
              (y = e),
              (g = s),
              (p = f),
              (m = c - s + 1),
              (w = h - f + 1))
            }
            u = new Uint8Array(t[l - 1 - y]);
            (y == 1 && (f[l - 1].dispose = 2),
            (c = new Uint8Array(m * w * 4)),
            e(u, r, i, c, m, w, -g, -p, 0),
            (v = e(h, r, i, c, m, w, -g, -p, 3) ? 1 : 0),
            v == 1
              ? _prepareDiff(h, r, i, c, {
                  x: g,
                  y: p,
                  width: m,
                  height: w,
                })
              : e(h, r, i, c, m, w, -g, -p, 0))
          }
          else {
            c = h.slice(0)
          }
          f.push({
            rect: { x: g, y: p, width: m, height: w },
            img: c,
            blend: v,
            dispose: 0,
          })
        }
        if (o) {
          for (l = 0; l < f.length; l++) {
            if ((A = f[l]).blend == 1)
              continue
            const e = A.rect
            const o = f[l - 1].rect
            const s = Math.min(e.x, o.x)
            const c = Math.min(e.y, o.y)
            const u = {
              x: s,
              y: c,
              width: Math.max(e.x + e.width, o.x + o.width) - s,
              height: Math.max(e.y + e.height, o.y + o.height) - c,
            };
            ((f[l - 1].dispose = 1),
            l - 1 != 0 && _updateFrame(t, r, i, f, l - 1, u, a),
            _updateFrame(t, r, i, f, l, u, a))
          }
        }
        let h = 0
        if (t.length != 1) {
          for (var d = 0; d < f.length; d++) {
            var A
            h += (A = f[d]).rect.width * A.rect.height
          }
        }
        return f
      })(t, r, i, s, f, l)
      const y = {}
      const E = []
      const F = []
      if (o != 0) {
        const e = []
        for (w = 0; w < b.length; w++) e.push(b[w].img.buffer)
        const t = (function concatRGBA(e) {
          let t = 0
          for (var r = 0; r < e.length; r++) t += e[r].byteLength
          const i = new Uint8Array(t)
          let o = 0
          for (r = 0; r < e.length; r++) {
            const t = new Uint8Array(e[r])
            const a = t.length
            for (let e = 0; e < a; e += 4) {
              let r = t[e]
              let a = t[e + 1]
              let s = t[e + 2]
              const f = t[e + 3];
              (f == 0 && (r = a = s = 0),
              (i[o + e] = r),
              (i[o + e + 1] = a),
              (i[o + e + 2] = s),
              (i[o + e + 3] = f))
            }
            o += a
          }
          return i.buffer
        })(e)
        const r = quantize(t, o)
        for (w = 0; w < r.plte.length; w++) E.push(r.plte[w].est.rgba)
        let i = 0
        for (w = 0; w < b.length; w++) {
          const e = (B = b[w]).img.length
          var _ = new Uint8Array(r.inds.buffer, i >> 2, e >> 2)
          F.push(_)
          const t = new Uint8Array(r.abuf, i, e);
          (h && dither(B.img, B.rect.width, B.rect.height, E, t, _),
          B.img.set(t),
          (i += e))
        }
      }
      else {
        for (p = 0; p < b.length; p++) {
          var B = b[p]
          const e = new Uint32Array(B.img.buffer)
          var U = B.rect.width;
          ((m = e.length), (_ = new Uint8Array(m)))
          F.push(_)
          for (w = 0; w < m; w++) {
            const t = e[w]
            if (w != 0 && t == e[w - 1]) {
              _[w] = _[w - 1]
            }
            else if (w > U && t == e[w - U]) {
              _[w] = _[w - U]
            }
            else {
              let e = y[t]
              if (
                e == null
                && ((y[t] = e = E.length), E.push(t), E.length >= 300)
              ) {
                break
              }
              _[w] = e
            }
          }
        }
      }
      const C = E.length
      C <= 256
      && u == 0
      && ((A = C <= 2 ? 1 : C <= 4 ? 2 : C <= 16 ? 4 : 8), (A = Math.max(A, c)))
      for (p = 0; p < b.length; p++) {
        ((B = b[p]).rect.x, B.rect.y)
        U = B.rect.width
        const e = B.rect.height
        let t = B.img
        new Uint32Array(t.buffer)
        let r = 4 * U
        let i = 4
        if (C <= 256 && u == 0) {
          r = Math.ceil((A * U) / 8)
          var I = new Uint8Array(r * e)
          const o = F[p]
          for (let t = 0; t < e; t++) {
            w = t * r
            const e = t * U
            if (A == 8) {
              for (var Q = 0; Q < U; Q++) I[w + Q] = o[e + Q]
            }
            else if (A == 4) {
              for (Q = 0; Q < U; Q++)
                I[w + (Q >> 1)] |= o[e + Q] << (4 - 4 * (1 & Q))
            }
            else if (A == 2) {
              for (Q = 0; Q < U; Q++)
                I[w + (Q >> 2)] |= o[e + Q] << (6 - 2 * (3 & Q))
            }
            else if (A == 1) {
              for (Q = 0; Q < U; Q++)
                I[w + (Q >> 3)] |= o[e + Q] << (7 - 1 * (7 & Q))
            }
          }
          ((t = I), (d = 3), (i = 1))
        }
        else if (v == 0 && b.length == 1) {
          I = new Uint8Array(U * e * 3)
          const o = U * e
          for (w = 0; w < o; w++) {
            const e = 3 * w
            const r = 4 * w;
            ((I[e] = t[r]), (I[e + 1] = t[r + 1]), (I[e + 2] = t[r + 2]))
          }
          ((t = I), (d = 2), (i = 3), (r = 3 * U))
        }
        ((B.img = t), (B.bpl = r), (B.bpp = i))
      }
      return { ctype: d, depth: A, plte: E, frames: b }
    }
    function _updateFrame(t, r, i, o, a, s, f) {
      const l = Uint8Array
      const c = Uint32Array
      const u = new l(t[a - 1])
      const h = new c(t[a - 1])
      const d = a + 1 < t.length ? new l(t[a + 1]) : null
      const A = new l(t[a])
      const g = new c(A.buffer)
      let p = r
      let m = i
      let w = -1
      let v = -1
      for (let e = 0; e < s.height; e++) {
        for (let t = 0; t < s.width; t++) {
          const i = s.x + t
          const f = s.y + e
          const l = f * r + i
          const c = g[l]
          c == 0
          || (o[a - 1].dispose == 0
            && h[l] == c
            && (d == null || d[4 * l + 3] != 0))
          || (i < p && (p = i),
          i > w && (w = i),
          f < m && (m = f),
          f > v && (v = f))
        }
      }
      (w == -1 && (p = m = w = v = 0),
      f && ((1 & p) == 1 && p--, (1 & m) == 1 && m--),
      (s = { x: p, y: m, width: w - p + 1, height: v - m + 1 }))
      const b = o[a];
      ((b.rect = s),
      (b.blend = 1),
      (b.img = new Uint8Array(s.width * s.height * 4)),
      o[a - 1].dispose == 0
        ? (e(u, r, i, b.img, s.width, s.height, -s.x, -s.y, 0),
          _prepareDiff(A, r, i, b.img, s))
        : e(A, r, i, b.img, s.width, s.height, -s.x, -s.y, 0))
    }
    function _prepareDiff(t, r, i, o, a) {
      e(t, r, i, o, a.width, a.height, -a.x, -a.y, 2)
    }
    function _filterZero(e, t, r, i, o, a, s) {
      const f = []
      let l
      let c = [0, 1, 2, 3, 4];
      (a != -1 ? (c = [a]) : (t * i > 5e5 || r == 1) && (c = [0]),
      s && (l = { level: 0 }))
      const u = UZIP
      for (var h = 0; h < c.length; h++) {
        for (let a = 0; a < t; a++) _filterLine(o, e, a, i, r, c[h])
        f.push(u.deflate(o, l))
      }
      let d
      let A = 1e9
      for (h = 0; h < f.length; h++)
        f[h].length < A && ((d = h), (A = f[h].length))
      return f[d]
    }
    function _filterLine(e, t, i, o, a, s) {
      const f = i * o
      let l = f + i
      if (((e[l] = s), l++, s == 0)) {
        if (o < 500) {
          for (var c = 0; c < o; c++) e[l + c] = t[f + c]
        }
        else {
          e.set(new Uint8Array(t.buffer, f, o), l)
        }
      }
      else if (s == 1) {
        for (c = 0; c < a; c++) e[l + c] = t[f + c]
        for (c = a; c < o; c++)
          e[l + c] = (t[f + c] - t[f + c - a] + 256) & 255
      }
      else if (i == 0) {
        for (c = 0; c < a; c++) e[l + c] = t[f + c]
        if (s == 2) {
          for (c = a; c < o; c++) e[l + c] = t[f + c]
        }
        if (s == 3) {
          for (c = a; c < o; c++)
            e[l + c] = (t[f + c] - (t[f + c - a] >> 1) + 256) & 255
        }
        if (s == 4) {
          for (c = a; c < o; c++)
            e[l + c] = (t[f + c] - r(t[f + c - a], 0, 0) + 256) & 255
        }
      }
      else {
        if (s == 2) {
          for (c = 0; c < o; c++)
            e[l + c] = (t[f + c] + 256 - t[f + c - o]) & 255
        }
        if (s == 3) {
          for (c = 0; c < a; c++)
            e[l + c] = (t[f + c] + 256 - (t[f + c - o] >> 1)) & 255
          for (c = a; c < o; c++) {
            e[l + c]
              = (t[f + c] + 256 - ((t[f + c - o] + t[f + c - a]) >> 1)) & 255
          }
        }
        if (s == 4) {
          for (c = 0; c < a; c++)
            e[l + c] = (t[f + c] + 256 - r(0, t[f + c - o], 0)) & 255
          for (c = a; c < o; c++) {
            e[l + c]
              = (t[f + c]
                + 256
                - r(t[f + c - a], t[f + c - o], t[f + c - a - o]))
              & 255
          }
        }
      }
    }
    function quantize(e, t) {
      const r = new Uint8Array(e)
      const i = r.slice(0)
      const o = new Uint32Array(i.buffer)
      const a = getKDtree(i, t)
      const s = a[0]
      const f = a[1]
      const l = r.length
      const c = new Uint8Array(l >> 2)
      let u
      if (r.length < 2e7) {
        for (var h = 0; h < l; h += 4) {
          ((u = getNearest(
            s,
            (d = r[h] * (1 / 255)),
            (A = r[h + 1] * (1 / 255)),
            (g = r[h + 2] * (1 / 255)),
            (p = r[h + 3] * (1 / 255)),
          )),
          (c[h >> 2] = u.ind),
          (o[h >> 2] = u.est.rgba))
        }
      }
      else {
        for (h = 0; h < l; h += 4) {
          var d = r[h] * (1 / 255)
          var A = r[h + 1] * (1 / 255)
          var g = r[h + 2] * (1 / 255)
          var p = r[h + 3] * (1 / 255)
          for (u = s; u.left;)
            u = planeDst(u.est, d, A, g, p) <= 0 ? u.left : u.right;
          ((c[h >> 2] = u.ind), (o[h >> 2] = u.est.rgba))
        }
      }
      return { abuf: i.buffer, inds: c, plte: f }
    }
    function getKDtree(e, t, r) {
      r == null && (r = 1e-4)
      const i = new Uint32Array(e.buffer)
      const o = {
        i0: 0,
        i1: e.length,
        bst: null,
        est: null,
        tdst: 0,
        left: null,
        right: null,
      };
      ((o.bst = stats(e, o.i0, o.i1)), (o.est = estats(o.bst)))
      const a = [o]
      for (; a.length < t;) {
        let t = 0
        let o = 0
        for (var s = 0; s < a.length; s++)
          a[s].est.L > t && ((t = a[s].est.L), (o = s))
        if (t < r)
          break
        const f = a[o]
        const l = splitPixels(e, i, f.i0, f.i1, f.est.e, f.est.eMq255)
        if (f.i0 >= l || f.i1 <= l) {
          f.est.L = 0
          continue
        }
        const c = {
          i0: f.i0,
          i1: l,
          bst: null,
          est: null,
          tdst: 0,
          left: null,
          right: null,
        };
        ((c.bst = stats(e, c.i0, c.i1)), (c.est = estats(c.bst)))
        const u = {
          i0: l,
          i1: f.i1,
          bst: null,
          est: null,
          tdst: 0,
          left: null,
          right: null,
        }
        u.bst = { R: [], m: [], N: f.bst.N - c.bst.N }
        for (s = 0; s < 16; s++) u.bst.R[s] = f.bst.R[s] - c.bst.R[s]
        for (s = 0; s < 4; s++) u.bst.m[s] = f.bst.m[s] - c.bst.m[s];
        ((u.est = estats(u.bst)),
        (f.left = c),
        (f.right = u),
        (a[o] = c),
        a.push(u))
      }
      a.sort((e, t) => t.bst.N - e.bst.N)
      for (s = 0; s < a.length; s++) a[s].ind = s
      return [o, a]
    }
    function getNearest(e, t, r, i, o) {
      if (e.left == null) {
        return (
          (e.tdst = (function dist(e, t, r, i, o) {
            const a = t - e[0]
            const s = r - e[1]
            const f = i - e[2]
            const l = o - e[3]
            return a * a + s * s + f * f + l * l
          })(e.est.q, t, r, i, o)),
          e
        )
      }
      const a = planeDst(e.est, t, r, i, o)
      let s = e.left
      let f = e.right
      a > 0 && ((s = e.right), (f = e.left))
      const l = getNearest(s, t, r, i, o)
      if (l.tdst <= a * a)
        return l
      const c = getNearest(f, t, r, i, o)
      return c.tdst < l.tdst ? c : l
    }
    function planeDst(e, t, r, i, o) {
      const { e: a } = e
      return a[0] * t + a[1] * r + a[2] * i + a[3] * o - e.eMq
    }
    function splitPixels(e, t, r, i, o, a) {
      for (i -= 4; r < i;) {
        for (; vecDot(e, r, o) <= a;) r += 4
        for (; vecDot(e, i, o) > a;) i -= 4
        if (r >= i)
          break
        const s = t[r >> 2];
        ((t[r >> 2] = t[i >> 2]), (t[i >> 2] = s), (r += 4), (i -= 4))
      }
      for (; vecDot(e, r, o) > a;) r -= 4
      return r + 4
    }
    function vecDot(e, t, r) {
      return e[t] * r[0] + e[t + 1] * r[1] + e[t + 2] * r[2] + e[t + 3] * r[3]
    }
    function stats(e, t, r) {
      const i = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const o = [0, 0, 0, 0]
      const a = (r - t) >> 2
      for (let a = t; a < r; a += 4) {
        const t = e[a] * (1 / 255)
        const r = e[a + 1] * (1 / 255)
        const s = e[a + 2] * (1 / 255)
        const f = e[a + 3] * (1 / 255);
        ((o[0] += t),
        (o[1] += r),
        (o[2] += s),
        (o[3] += f),
        (i[0] += t * t),
        (i[1] += t * r),
        (i[2] += t * s),
        (i[3] += t * f),
        (i[5] += r * r),
        (i[6] += r * s),
        (i[7] += r * f),
        (i[10] += s * s),
        (i[11] += s * f),
        (i[15] += f * f))
      }
      return (
        (i[4] = i[1]),
        (i[8] = i[2]),
        (i[9] = i[6]),
        (i[12] = i[3]),
        (i[13] = i[7]),
        (i[14] = i[11]),
        { R: i, m: o, N: a }
      )
    }
    function estats(e) {
      const { R: t } = e
      const { m: r } = e
      const { N: i } = e
      const a = r[0]
      const s = r[1]
      const f = r[2]
      const l = r[3]
      const c = i == 0 ? 0 : 1 / i
      const u = [
        t[0] - a * a * c,
        t[1] - a * s * c,
        t[2] - a * f * c,
        t[3] - a * l * c,
        t[4] - s * a * c,
        t[5] - s * s * c,
        t[6] - s * f * c,
        t[7] - s * l * c,
        t[8] - f * a * c,
        t[9] - f * s * c,
        t[10] - f * f * c,
        t[11] - f * l * c,
        t[12] - l * a * c,
        t[13] - l * s * c,
        t[14] - l * f * c,
        t[15] - l * l * c,
      ]
      const h = u
      const d = o
      let A = [Math.random(), Math.random(), Math.random(), Math.random()]
      let g = 0
      let p = 0
      if (i != 0) {
        for (
          let e = 0;
          e < 16
          && ((A = d.multVec(h, A)),
          (p = Math.sqrt(d.dot(A, A))),
          (A = d.sml(1 / p, A)),
          !(e != 0 && Math.abs(p - g) < 1e-9));
          e++
        )
          g = p
      }
      const m = [a * c, s * c, f * c, l * c]
      return {
        Cov: u,
        q: m,
        e: A,
        L: g,
        eMq255: d.dot(d.sml(255, m), A),
        eMq: d.dot(A, m),
        rgba:
          ((Math.round(255 * m[3]) << 24)
            | (Math.round(255 * m[2]) << 16)
            | (Math.round(255 * m[1]) << 8)
            | (Math.round(255 * m[0]) << 0))
          >>> 0,
      }
    }
    var o = {
      multVec: (e, t) => [
        e[0] * t[0] + e[1] * t[1] + e[2] * t[2] + e[3] * t[3],
        e[4] * t[0] + e[5] * t[1] + e[6] * t[2] + e[7] * t[3],
        e[8] * t[0] + e[9] * t[1] + e[10] * t[2] + e[11] * t[3],
        e[12] * t[0] + e[13] * t[1] + e[14] * t[2] + e[15] * t[3],
      ],
      dot: (e, t) => e[0] * t[0] + e[1] * t[1] + e[2] * t[2] + e[3] * t[3],
      sml: (e, t) => [e * t[0], e * t[1], e * t[2], e * t[3]],
    };
    ((UPNG.encode = function encode(e, t, r, i, o, a, s) {
      (i == null && (i = 0), s == null && (s = !1))
      const f = compress(e, t, r, i, [!1, !1, !1, 0, s, !1])
      return (compressPNG(f, -1), _main(f, t, r, o, a))
    }),
    (UPNG.encodeLL = function encodeLL(e, t, r, i, o, a, s, f) {
      const l = {
        ctype: 0 + (i == 1 ? 0 : 2) + (o == 0 ? 0 : 4),
        depth: a,
        frames: [],
      }
      const c = (i + o) * a
      const u = c * t
      for (let i = 0; i < e.length; i++) {
        l.frames.push({
          rect: { x: 0, y: 0, width: t, height: r },
          img: new Uint8Array(e[i]),
          blend: 0,
          dispose: 1,
          bpp: Math.ceil(c / 8),
          bpl: Math.ceil(u / 8),
        })
      }
      return (compressPNG(l, 0, !0), _main(l, t, r, s, f))
    }),
    (UPNG.encode.compress = compress),
    (UPNG.encode.dither = dither),
    (UPNG.quantize = quantize),
    (UPNG.quantize.getKDtree = getKDtree),
    (UPNG.quantize.getNearest = getNearest))
  })()
  const t = {
    toArrayBuffer(e, r) {
      const i = e.width
      const o = e.height
      const a = i << 2
      const s = e.getContext('2d').getImageData(0, 0, i, o)
      const f = new Uint32Array(s.data.buffer)
      const l = ((32 * i + 31) / 32) << 2
      const c = l * o
      const u = 122 + c
      const h = new ArrayBuffer(u)
      const d = new DataView(h)
      const A = 1 << 20
      let g
      let p
      let m
      let w
      let v = A
      let b = 0
      let y = 0
      let E = 0
      function set16(e) {
        (d.setUint16(y, e, !0), (y += 2))
      }
      function set32(e) {
        (d.setUint32(y, e, !0), (y += 4))
      }
      function seek(e) {
        y += e
      }
      (set16(19778),
      set32(u),
      seek(4),
      set32(122),
      set32(108),
      set32(i),
      set32(-o >>> 0),
      set16(1),
      set16(32),
      set32(3),
      set32(c),
      set32(2835),
      set32(2835),
      seek(8),
      set32(16711680),
      set32(65280),
      set32(255),
      set32(4278190080),
      set32(1466527264),
      (function convert() {
        for (; b < o && v > 0;) {
          for (w = 122 + b * l, g = 0; g < a;) {
            (v--,
            (p = f[E++]),
            (m = p >>> 24),
            d.setUint32(w + g, (p << 8) | m),
            (g += 4))
          }
          b++
        }
        E < f.length ? ((v = A), setTimeout(convert, t._dly)) : r(h)
      })())
    },
    toBlob(e, t) {
      this.toArrayBuffer(e, (e) => {
        t(new Blob([e], { type: 'image/bmp' }))
      })
    },
    _dly: 9,
  }
  const r = {
    CHROME: 'CHROME',
    FIREFOX: 'FIREFOX',
    DESKTOP_SAFARI: 'DESKTOP_SAFARI',
    IE: 'IE',
    IOS: 'IOS',
    ETC: 'ETC',
  }
  const i = {
    [r.CHROME]: 16384,
    [r.FIREFOX]: 11180,
    [r.DESKTOP_SAFARI]: 16384,
    [r.IE]: 8192,
    [r.IOS]: 4096,
    [r.ETC]: 8192,
  }
  const o = typeof window != 'undefined'
  const a
    = typeof WorkerGlobalScope != 'undefined'
      && self instanceof WorkerGlobalScope
  const s
    = o
      && window.cordova
      && window.cordova.require
      && window.cordova.require('cordova/modulemapper')
  const CustomFile
    = (o || a)
      && ((s && s.getOriginalSymbol(window, 'File'))
        || (typeof File != 'undefined' && File))
  const CustomFileReader
    = (o || a)
      && ((s && s.getOriginalSymbol(window, 'FileReader'))
        || (typeof FileReader != 'undefined' && FileReader))
  function getFilefromDataUrl(e, t, r = Date.now()) {
    return new Promise((i) => {
      const o = e.split(',')
      const a = o[0].match(/:(.*?);/)[1]
      const s = globalThis.atob(o[1])
      let f = s.length
      const l = new Uint8Array(f)
      for (; f--;) l[f] = s.charCodeAt(f)
      const c = new Blob([l], { type: a });
      ((c.name = t), (c.lastModified = r), i(c))
    })
  }
  function getDataUrlFromFile(e) {
    return new Promise((t, r) => {
      const i = new CustomFileReader();
      ((i.onload = () => t(i.result)),
      (i.onerror = e => r(e)),
      i.readAsDataURL(e))
    })
  }
  function loadImage(e) {
    return new Promise((t, r) => {
      const i = new Image();
      ((i.onload = () => t(i)), (i.onerror = e => r(e)), (i.src = e))
    })
  }
  function getBrowserName() {
    if (void 0 !== getBrowserName.cachedResult)
      return getBrowserName.cachedResult
    let e = r.ETC
    const { userAgent: t } = navigator
    return (
      /Chrom(e|ium)/i.test(t)
        ? (e = r.CHROME)
        : /iP(ad|od|hone)/i.test(t) && /WebKit/i.test(t)
          ? (e = r.IOS)
          : /Safari/i.test(t)
            ? (e = r.DESKTOP_SAFARI)
            : /Firefox/i.test(t)
              ? (e = r.FIREFOX)
              : (/MSIE/i.test(t) || !0 == !!document.documentMode)
                && (e = r.IE),
      (getBrowserName.cachedResult = e),
      getBrowserName.cachedResult
    )
  }
  function approximateBelowMaximumCanvasSizeOfBrowser(e, t) {
    const r = getBrowserName()
    const o = i[r]
    let a = e
    let s = t
    let f = a * s
    const l = a > s ? s / a : a / s
    for (; f > o * o;) {
      const e = (o + a) / 2
      const t = (o + s) / 2;
      (e < t ? ((s = t), (a = t * l)) : ((s = e * l), (a = e)), (f = a * s))
    }
    return { width: a, height: s }
  }
  function getNewCanvasAndCtx(e, t) {
    let r, i
    try {
      if (
        ((r = new OffscreenCanvas(e, t)), (i = r.getContext('2d')), i === null)
      )
        throw new Error('getContext of OffscreenCanvas returns null')
    }
    catch (e) {
      ((r = document.createElement('canvas')), (i = r.getContext('2d')))
    }
    return ((r.width = e), (r.height = t), [r, i])
  }
  function drawImageInCanvas(e, t) {
    const { width: r, height: i } = approximateBelowMaximumCanvasSizeOfBrowser(
      e.width,
      e.height,
    )
    const [o, a] = getNewCanvasAndCtx(r, i)
    return (
      t
      && /jpe?g/.test(t)
      && ((a.fillStyle = 'white'), a.fillRect(0, 0, o.width, o.height)),
      a.drawImage(e, 0, 0, o.width, o.height),
      o
    )
  }
  function isIOS() {
    return (
      void 0 !== isIOS.cachedResult
        || (isIOS.cachedResult
          = [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod',
          ].includes(navigator.platform)
          || (navigator.userAgent.includes('Mac')
            && typeof document != 'undefined'
            && 'ontouchend' in document)),
      isIOS.cachedResult
    )
  }
  function drawFileInCanvas(e, t = {}) {
    return new Promise((i, o) => {
      let a, s
      const $Try_2_Post = function () {
        try {
          return (
            (s = drawImageInCanvas(a, t.fileType || e.type)),
            i([a, s])
          )
        }
        catch (e) {
          return o(e)
        }
      }
      const $Try_2_Catch = function (t) {
        try {
          0
          const $Try_3_Catch = function (e) {
            try {
              throw e
            }
            catch (e) {
              return o(e)
            }
          }
          try {
            let t
            return getDataUrlFromFile(e).then((e) => {
              try {
                return (
                  (t = e),
                  loadImage(t).then((e) => {
                    try {
                      return (
                        (a = e),
                        (function () {
                          try {
                            return $Try_2_Post()
                          }
                          catch (e) {
                            return o(e)
                          }
                        })()
                      )
                    }
                    catch (e) {
                      return $Try_3_Catch(e)
                    }
                  }, $Try_3_Catch)
                )
              }
              catch (e) {
                return $Try_3_Catch(e)
              }
            }, $Try_3_Catch)
          }
          catch (e) {
            $Try_3_Catch(e)
          }
        }
        catch (e) {
          return o(e)
        }
      }
      try {
        if (
          isIOS()
          || [r.DESKTOP_SAFARI, r.MOBILE_SAFARI].includes(getBrowserName())
        ) {
          throw new Error('Skip createImageBitmap on IOS and Safari')
        }
        return createImageBitmap(e).then((e) => {
          try {
            return ((a = e), $Try_2_Post())
          }
          catch (e) {
            return $Try_2_Catch()
          }
        }, $Try_2_Catch)
      }
      catch (e) {
        $Try_2_Catch()
      }
    })
  }
  function canvasToFile(e, r, i, o, a = 1) {
    return new Promise(function (s, f) {
      let l
      if (r === 'image/png') {
        let c, u, h
        return (
          (c = e.getContext('2d')),
          ({ data: u } = c.getImageData(0, 0, e.width, e.height)),
          (h = UPNG.encode([u.buffer], e.width, e.height, 4096 * a)),
          (l = new Blob([h], { type: r })),
          (l.name = i),
          (l.lastModified = o),
          $If_4.call(this)
        )
      }
      {
        if (r === 'image/bmp') {
          return new Promise(r => t.toBlob(e, r)).then(
            (e) => {
              try {
                return (
                  (l = e),
                  (l.name = i),
                  (l.lastModified = o),
                  $If_5.call(this)
                )
              }
              catch (e) {
                return f(e)
              }
            },
            f,
          )
        }
        {
          if (
            typeof OffscreenCanvas == 'function'
            && e instanceof OffscreenCanvas
          ) {
            return e.convertToBlob({ type: r, quality: a }).then(
              (e) => {
                try {
                  return (
                    (l = e),
                    (l.name = i),
                    (l.lastModified = o),
                    $If_6.call(this)
                  )
                }
                catch (e) {
                  return f(e)
                }
              },
              f,
            )
          }
          {
            let d
            return (
              (d = e.toDataURL(r, a)),
              getFilefromDataUrl(d, i, o).then(
                (e) => {
                  try {
                    return ((l = e), $If_6.call(this))
                  }
                  catch (e) {
                    return f(e)
                  }
                },
                f,
              )
            )
          }
          function $If_6() {
            return $If_5.call(this)
          }
        }
        function $If_5() {
          return $If_4.call(this)
        }
      }
      function $If_4() {
        return s(l)
      }
    })
  }
  function cleanupCanvasMemory(e) {
    ((e.width = 0), (e.height = 0))
  }
  function isAutoOrientationInBrowser() {
    return new Promise((e, t) => {
      let r, i, o, a, s
      return void 0 !== isAutoOrientationInBrowser.cachedResult
        ? e(isAutoOrientationInBrowser.cachedResult)
        : ((r
            = 'data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAEAAgMBEQACEQEDEQH/xABKAAEAAAAAAAAAAAAAAAAAAAALEAEAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H//2Q=='),
          getFilefromDataUrl(
            'data:image/jpeg;base64,/9j/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIAAEAAgMBEQACEQEDEQH/xABKAAEAAAAAAAAAAAAAAAAAAAALEAEAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8H//2Q==',
            'test.jpg',
            Date.now(),
          ).then((r) => {
            try {
              return (
                (i = r),
                drawFileInCanvas(i).then((r) => {
                  try {
                    return (
                      (o = r[1]),
                      canvasToFile(o, i.type, i.name, i.lastModified).then(
                        (r) => {
                          try {
                            return (
                              (a = r),
                              cleanupCanvasMemory(o),
                              drawFileInCanvas(a).then((r) => {
                                try {
                                  return (
                                    (s = r[0]),
                                    (isAutoOrientationInBrowser.cachedResult
                                      = s.width === 1 && s.height === 2),
                                    e(isAutoOrientationInBrowser.cachedResult)
                                  )
                                }
                                catch (e) {
                                  return t(e)
                                }
                              }, t)
                            )
                          }
                          catch (e) {
                            return t(e)
                          }
                        },
                        t,
                      )
                    )
                  }
                  catch (e) {
                    return t(e)
                  }
                }, t)
              )
            }
            catch (e) {
              return t(e)
            }
          }, t))
    })
  }
  function getExifOrientation(e) {
    return new Promise((t, r) => {
      const i = new CustomFileReader();
      ((i.onload = (e) => {
        const r = new DataView(e.target.result)
        if (r.getUint16(0, !1) != 65496)
          return t(-2)
        const i = r.byteLength
        let o = 2
        for (; o < i;) {
          if (r.getUint16(o + 2, !1) <= 8)
            return t(-1)
          const e = r.getUint16(o, !1)
          if (((o += 2), e == 65505)) {
            if (r.getUint32((o += 2), !1) != 1165519206)
              return t(-1)
            const e = r.getUint16((o += 6), !1) == 18761
            o += r.getUint32(o + 4, e)
            const i = r.getUint16(o, e)
            o += 2
            for (let a = 0; a < i; a++) {
              if (r.getUint16(o + 12 * a, e) == 274)
                return t(r.getUint16(o + 12 * a + 8, e))
            }
          }
          else {
            if ((65280 & e) != 65280)
              break
            o += r.getUint16(o, !1)
          }
        }
        return t(-1)
      }),
      (i.onerror = e => r(e)),
      i.readAsArrayBuffer(e))
    })
  }
  function handleMaxWidthOrHeight(e, t) {
    const { width: r } = e
    const { height: i } = e
    const { maxWidthOrHeight: o } = t
    let a
    let s = e
    return (
      isFinite(o)
      && (r > o || i > o)
      && (([s, a] = getNewCanvasAndCtx(r, i)),
      r > i
        ? ((s.width = o), (s.height = (i / r) * o))
        : ((s.width = (r / i) * o), (s.height = o)),
      a.drawImage(e, 0, 0, s.width, s.height),
      cleanupCanvasMemory(e)),
      s
    )
  }
  function followExifOrientation(e, t) {
    const { width: r } = e
    const { height: i } = e
    const [o, a] = getNewCanvasAndCtx(r, i)
    switch (
      (t > 4 && t < 9
        ? ((o.width = i), (o.height = r))
        : ((o.width = r), (o.height = i)),
      t)
    ) {
      case 2:
        a.transform(-1, 0, 0, 1, r, 0)
        break
      case 3:
        a.transform(-1, 0, 0, -1, r, i)
        break
      case 4:
        a.transform(1, 0, 0, -1, 0, i)
        break
      case 5:
        a.transform(0, 1, 1, 0, 0, 0)
        break
      case 6:
        a.transform(0, 1, -1, 0, i, 0)
        break
      case 7:
        a.transform(0, -1, -1, 0, i, r)
        break
      case 8:
        a.transform(0, -1, 1, 0, 0, r)
    }
    return (a.drawImage(e, 0, 0, r, i), cleanupCanvasMemory(e), o)
  }
  function compress(e, t, r = 0) {
    return new Promise(function (i, o) {
      let a, s, f, l, c, u, h, d, A, g, p, m, w, v, b, y, E, F, _, B
      function incProgress(e = 5) {
        if (t.signal && t.signal.aborted)
          throw t.signal.reason;
        ((a += e), t.onProgress(Math.min(a, 100)))
      }
      function setProgress(e) {
        if (t.signal && t.signal.aborted)
          throw t.signal.reason;
        ((a = Math.min(Math.max(e, a), 100)), t.onProgress(a))
      }
      return (
        (a = r),
        (s = t.maxIteration || 10),
        (f = 1024 * t.maxSizeMB * 1024),
        incProgress(),
        drawFileInCanvas(e, t).then(
          (r) => {
            try {
              return (
                ([, l] = r),
                incProgress(),
                (c = handleMaxWidthOrHeight(l, t)),
                incProgress(),
                new Promise(function (r, i) {
                  let o
                  if (!(o = t.exifOrientation)) {
                    return getExifOrientation(e).then(
                      (e) => {
                        try {
                          return ((o = e), $If_2.call(this))
                        }
                        catch (e) {
                          return i(e)
                        }
                      },
                      i,
                    )
                  }
                  function $If_2() {
                    return r(o)
                  }
                  return $If_2.call(this)
                }).then(
                  (r) => {
                    try {
                      return (
                        (u = r),
                        incProgress(),
                        isAutoOrientationInBrowser().then(
                          (r) => {
                            try {
                              return (
                                (h = r ? c : followExifOrientation(c, u)),
                                incProgress(),
                                (d = t.initialQuality || 1),
                                (A = t.fileType || e.type),
                                canvasToFile(
                                  h,
                                  A,
                                  e.name,
                                  e.lastModified,
                                  d,
                                ).then(
                                  (r) => {
                                    try {
                                      {
                                        if (
                                          ((g = r),
                                          incProgress(),
                                          (p = g.size > f),
                                          (m = g.size > e.size),
                                          !p && !m)
                                        ) {
                                          return (setProgress(100), i(g))
                                        }
                                        let a
                                        function $Loop_3() {
                                          if (s-- && (b > f || b > w)) {
                                            let t, r
                                            return (
                                              (t = B
                                                ? 0.95 * _.width
                                                : _.width),
                                              (r = B
                                                ? 0.95 * _.height
                                                : _.height),
                                              ([E, F] = getNewCanvasAndCtx(
                                                t,
                                                r,
                                              )),
                                              F.drawImage(_, 0, 0, t, r),
                                              (d
                                                *= A === 'image/png'
                                                  ? 0.85
                                                  : 0.95),
                                              canvasToFile(
                                                E,
                                                A,
                                                e.name,
                                                e.lastModified,
                                                d,
                                              ).then((e) => {
                                                try {
                                                  return (
                                                    (y = e),
                                                    cleanupCanvasMemory(_),
                                                    (_ = E),
                                                    (b = y.size),
                                                    setProgress(
                                                      Math.min(
                                                        99,
                                                        Math.floor(
                                                          ((v - b) / (v - f))
                                                          * 100,
                                                        ),
                                                      ),
                                                    ),
                                                    $Loop_3
                                                  )
                                                }
                                                catch (e) {
                                                  return o(e)
                                                }
                                              }, o)
                                            )
                                          }
                                          return [1]
                                        }
                                        return (
                                          (w = e.size),
                                          (v = g.size),
                                          (b = v),
                                          (_ = h),
                                          (B = !t.alwaysKeepResolution && p),
                                          (a = function (e) {
                                            for (; e;) {
                                              if (e.then)
                                                return void e.then(a, o)
                                              try {
                                                if (e.pop) {
                                                  if (e.length) {
                                                    return e.pop()
                                                      ? $Loop_3_exit.call(this)
                                                      : e
                                                  }
                                                  e = $Loop_3
                                                }
                                                else {
                                                  e = e.call(this)
                                                }
                                              }
                                              catch (e) {
                                                return o(e)
                                              }
                                            }
                                          }.bind(this))($Loop_3)
                                        )
                                        function $Loop_3_exit() {
                                          return (
                                            cleanupCanvasMemory(_),
                                            cleanupCanvasMemory(E),
                                            cleanupCanvasMemory(c),
                                            cleanupCanvasMemory(h),
                                            cleanupCanvasMemory(l),
                                            setProgress(100),
                                            i(y)
                                          )
                                        }
                                      }
                                    }
                                    catch (u) {
                                      return o(u)
                                    }
                                  },
                                  o,
                                )
                              )
                            }
                            catch (e) {
                              return o(e)
                            }
                          },
                          o,
                        )
                      )
                    }
                    catch (e) {
                      return o(e)
                    }
                  },
                  o,
                )
              )
            }
            catch (e) {
              return o(e)
            }
          },
          o,
        )
      )
    })
  }
  const f
    = '\nlet scriptImported = false\nself.addEventListener(\'message\', async (e) => {\n  const { file, id, imageCompressionLibUrl, options } = e.data\n  options.onProgress = (progress) => self.postMessage({ progress, id })\n  try {\n    if (!scriptImported) {\n      // console.log(\'[worker] importScripts\', imageCompressionLibUrl)\n      self.importScripts(imageCompressionLibUrl)\n      scriptImported = true\n    }\n    // console.log(\'[worker] self\', self)\n    const compressedFile = await imageCompression(file, options)\n    self.postMessage({ file: compressedFile, id })\n  } catch (e) {\n    // console.error(\'[worker] error\', e)\n    self.postMessage({ error: e.message + \'\\n\' + e.stack, id })\n  }\n})\n'
  let l
  function compressOnWebWorker(e, t) {
    return new Promise((r, i) => {
      l
      || (l = (function createWorkerScriptURL(e) {
        const t = []
        return (
          typeof e == 'function' ? t.push(`(${e})()`) : t.push(e),
          URL.createObjectURL(new Blob(t))
        )
      })(f))
      const o = new Worker(l);
      (o.addEventListener('message', (e) => {
        if (t.signal && t.signal.aborted) {
          o.terminate()
        }
        else if (void 0 === e.data.progress) {
          if (e.data.error)
            return (i(new Error(e.data.error)), void o.terminate());
          (r(e.data.file), o.terminate())
        }
        else {
          t.onProgress(e.data.progress)
        }
      }),
      o.addEventListener('error', i),
      t.signal
      && t.signal.addEventListener('abort', () => {
        (i(t.signal.reason), o.terminate())
      }),
      o.postMessage({
        file: e,
        imageCompressionLibUrl: t.libURL,
        options: { ...t, onProgress: void 0, signal: void 0 },
      }))
    })
  }
  function imageCompression(e, t) {
    return new Promise(function (r, i) {
      let o, a, s, f, l, c
      if (
        ((o = { ...t }),
        (s = 0),
        ({ onProgress: f } = o),
        (o.maxSizeMB = o.maxSizeMB || Number.POSITIVE_INFINITY),
        (l = typeof o.useWebWorker != 'boolean' || o.useWebWorker),
        delete o.useWebWorker,
        (o.onProgress = (e) => {
          ((s = e), typeof f == 'function' && f(s))
        }),
        !(e instanceof Blob || e instanceof CustomFile))
      ) {
        return i(
          new Error('The file given is not an instance of Blob or File'),
        )
      }
      if (!e.type.startsWith('image'))
        return i(new Error('The file given is not an image'))
      if (
        ((c
          = typeof WorkerGlobalScope != 'undefined'
            && self instanceof WorkerGlobalScope),
        !l || typeof Worker != 'function' || c)
      ) {
        return compress(e, o).then(
          (e) => {
            try {
              return ((a = e), $If_4.call(this))
            }
            catch (e) {
              return i(e)
            }
          },
          i,
        )
      }
      const u = function () {
        try {
          return $If_4.call(this)
        }
        catch (e) {
          return i(e)
        }
      }.bind(this)
      const $Try_1_Catch = function (t) {
        try {
          return compress(e, o).then((e) => {
            try {
              return ((a = e), u())
            }
            catch (e) {
              return i(e)
            }
          }, i)
        }
        catch (e) {
          return i(e)
        }
      }
      try {
        return (
          (o.libURL
            = o.libURL
              || 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js'),
          compressOnWebWorker(e, o).then((e) => {
            try {
              return ((a = e), u())
            }
            catch (e) {
              return $Try_1_Catch()
            }
          }, $Try_1_Catch)
        )
      }
      catch (e) {
        $Try_1_Catch()
      }
      function $If_4() {
        try {
          ((a.name = e.name), (a.lastModified = e.lastModified))
        }
        catch (e) {}
        try {
          o.preserveExif
          && e.type === 'image/jpeg'
          && (!o.fileType || (o.fileType && o.fileType === e.type))
          && (a = copyExifWithoutOrientation(e, a))
        }
        catch (e) {}
        return r(a)
      }
    })
  }
  return (
    (imageCompression.getDataUrlFromFile = getDataUrlFromFile),
    (imageCompression.getFilefromDataUrl = getFilefromDataUrl),
    (imageCompression.loadImage = loadImage),
    (imageCompression.drawImageInCanvas = drawImageInCanvas),
    (imageCompression.drawFileInCanvas = drawFileInCanvas),
    (imageCompression.canvasToFile = canvasToFile),
    (imageCompression.getExifOrientation = getExifOrientation),
    (imageCompression.handleMaxWidthOrHeight = handleMaxWidthOrHeight),
    (imageCompression.followExifOrientation = followExifOrientation),
    (imageCompression.cleanupCanvasMemory = cleanupCanvasMemory),
    (imageCompression.isAutoOrientationInBrowser = isAutoOrientationInBrowser),
    (imageCompression.approximateBelowMaximumCanvasSizeOfBrowser
      = approximateBelowMaximumCanvasSizeOfBrowser),
    (imageCompression.copyExifWithoutOrientation = copyExifWithoutOrientation),
    (imageCompression.getBrowserName = getBrowserName),
    (imageCompression.version = '2.0.2'),
    imageCompression
  )
})
// # sourceMappingURL=browser-image-compression.js.map
