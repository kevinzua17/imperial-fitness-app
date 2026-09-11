import React, { useEffect, useRef, useState } from 'react';
import { Camera, Heart, Image, MessageCircle, Send, Tag, Users } from 'lucide-react';
import { ClientProfile, SocialPost } from '../data/mockData';
import { createCommunityPostInApi, createPostCommentInApi, listCommunityPostsFromApi, listPostCommentsFromApi, reactToCommunityPost } from '../services/communityService';

interface SocialWallViewProps {
  posts: SocialPost[];
  currentUser: ClientProfile;
  onAddPost: (post: SocialPost) => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  users: ClientProfile[];
}

export const SocialWallView: React.FC<SocialWallViewProps> = ({ posts, currentUser, onAddPost, onToggleLike, onAddComment, users }) => {
  const [feedPosts, setFeedPosts] = useState<SocialPost[]>(posts);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('progreso');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [onlyFriends, setOnlyFriends] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [message, setMessage] = useState('');
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadPosts = () => {
    listCommunityPostsFromApi(tagFilter || undefined, onlyFriends)
      .then(setFeedPosts)
      .catch(() => setFeedPosts(posts));
  };

  useEffect(() => {
    loadPosts();
  }, [onlyFriends, tagFilter, posts]);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Formato no permitido. Usa JPG, PNG o WEBP.');
      return;
    }
    setSelectedImage(file);
    setMessage('');
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedImage) return;
    createCommunityPostInApi({ content, tags, file: selectedImage })
      .then((newPost) => {
        setFeedPosts(prev => [newPost, ...prev]);
        onAddPost(newPost);
        setContent('');
        setSelectedImage(null);
        setTags('progreso');
        setMessage('Publicación subida correctamente.');
      })
      .catch(() => setMessage('No se pudo publicar. Revisa backend, permisos o formato de imagen.'));
  };

  const handleCommentSubmit = (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    createPostCommentInApi(postId, text.trim())
      .then((created) => {
        onAddComment(postId, text.trim());
        setFeedPosts(prev => prev.map(p => p.id === postId ? {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [...p.comments, { id: String(created.comment_id), author: currentUser.name, text, timeAgo: 'Justo ahora' }]
        } : p));
        setCommentInputs({ ...commentInputs, [postId]: '' });
      })
      .catch(() => setMessage('No se pudo guardar el comentario en el backend.'));
  };

  const toggleComments = (postId: string) => {
    const willOpen = !openComments[postId];
    setOpenComments(prev => ({ ...prev, [postId]: willOpen }));
    if (willOpen) {
      listPostCommentsFromApi(postId)
        .then(comments => {
          setFeedPosts(prev => prev.map(post => post.id === postId ? {
            ...post,
            comments: comments.map(comment => ({
              id: String(comment.id),
              author: comment.author_name,
              text: comment.text,
              timeAgo: new Date(comment.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
            })),
            commentsCount: comments.length
          } : post));
        })
        .catch(() => setMessage('No se pudieron cargar comentarios reales.'));
    }
  };

  const suggestedTags = ['progreso', 'pierna', 'nutricion', 'reto30dias', 'motivacion', 'entrenamiento', 'cardio', 'fuerza'];
  const stories = users.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      <div>
        <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-2 font-bold">Comunidad privada</span>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {stories.length > 0 ? stories.map(member => (
            <div key={member.id} className="flex flex-col items-center shrink-0">
              <img src={member.avatar} alt={member.name} className="w-13 h-13 rounded-full object-cover border-2 border-red-700/70" />
              <span className="text-[10px] text-neutral-400 mt-1 block max-w-[70px] truncate text-center font-medium">{member.name}</span>
            </div>
          )) : <span className="text-xs text-neutral-500">Aún no hay miembros activos.</span>}
        </div>
      </div>

      {message && <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex gap-3 items-start">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover border border-neutral-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <form onSubmit={handlePostSubmit} className="space-y-3">
                  <textarea
                    placeholder={`Comparte tu progreso, duda o logro, ${currentUser.name.split(' ')[0]}...`}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={3}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-600 placeholder:text-neutral-600 resize-none"
                  />

                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
                    className={`rounded-lg border border-dashed p-3 text-xs cursor-pointer transition-all ${isDragging ? 'border-red-500 bg-red-950/20 text-white' : 'border-neutral-800 bg-neutral-900/50 text-neutral-500 hover:border-red-800'}`}
                  >
                    <Image className="w-3.5 h-3.5 inline mr-1 text-red-500" />
                    {selectedImage ? selectedImage.name : 'Añadir foto desde PC/celular o arrastrar aquí (opcional)'}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Etiquetas: progreso, pierna, nutricion" className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-600" />
                    <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                      <Send className="w-3 h-3" /> Publicar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {feedPosts.length > 0 ? feedPosts.map(post => (
              <div key={post.id} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="p-3.5 flex justify-between items-center bg-neutral-950/60 border-b border-neutral-900">
                  <div className="flex items-center gap-2.5">
                    <img src={post.authorAvatar} alt={post.authorName} className="w-9 h-9 rounded-full object-cover border border-neutral-700" />
                    <div>
                      <span className="text-xs font-bold text-white block">{post.authorName}</span>
                      <span className="text-[9px] text-neutral-500 block">{post.timeAgo}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">Imperial App</span>
                </div>

                {post.content && <div className="p-4"><p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line">{post.content}</p></div>}

                {post.imageUrl && (
                  <div className="border-t border-b border-neutral-900 bg-black flex justify-center">
                    <img src={post.imageUrl} alt="Publicación" className="w-full max-h-[460px] object-contain mx-auto bg-black" />
                  </div>
                )}

                <div className="px-4 py-2 bg-neutral-950 flex justify-between items-center text-[11px] text-neutral-400 border-b border-neutral-900/60">
                  <span className="flex items-center gap-1 font-semibold"><Heart className="w-3 h-3 text-red-500" /> {post.likes} me gusta</span>
                  <span>{post.commentsCount || post.comments.length} comentarios</span>
                </div>

                <div className="px-2 py-1 bg-neutral-950 flex gap-1">
                  <button
                    onClick={() => {
                      reactToCommunityPost(post.id).catch(() => undefined);
                      onToggleLike(post.id);
                      setFeedPosts(prev => prev.map(p => p.id === post.id ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? Math.max(0, p.likes - 1) : p.likes + 1 } : p));
                    }}
                    className={`flex-1 py-1.5 rounded text-xs flex items-center justify-center gap-1.5 transition-colors ${post.likedByMe ? 'text-red-500 font-bold' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-red-500' : ''}`} /> Me gusta
                  </button>
                  <button onClick={() => toggleComments(post.id)} className="flex-1 py-1.5 rounded text-xs text-neutral-400 hover:bg-neutral-900 hover:text-white flex items-center justify-center gap-1.5 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" /> Comentar
                  </button>
                </div>

                {openComments[post.id] && <div className="bg-neutral-950/40 p-3 space-y-2 border-t border-neutral-900">
                  {post.comments.map(comm => (
                    <div key={comm.id} className="text-xs bg-neutral-900/50 p-2 rounded border border-neutral-850">
                      <span className="font-bold text-white text-[11px]">{comm.author}</span>
                      <p className="text-neutral-300 font-light text-[11px]">{comm.text}</p>
                    </div>
                  ))}
                  <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="flex gap-2">
                    <input value={commentInputs[post.id] || ''} onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })} placeholder="Añadir comentario..." className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 placeholder:text-neutral-600" />
                    <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-2.5 rounded-lg text-xs border border-neutral-800 transition-colors">Enviar</button>
                  </form>
                </div>}
              </div>
            )) : (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
                <Camera className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-neutral-300">Aún no hay publicaciones en la comunidad.</p>
                <p className="text-xs text-neutral-500 mt-1">Sé el primero en compartir tu progreso.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-900"><Tag className="w-4 h-4 text-red-500" /><h3 className="text-xs font-bold uppercase tracking-wider text-white">Filtrar por etiqueta</h3></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTagFilter('')} className={`text-[10px] px-2 py-1 rounded ${!tagFilter ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>Todas</button>
              {suggestedTags.map(tag => <button key={tag} onClick={() => setTagFilter(tag)} className={`text-[10px] px-2 py-1 rounded ${tagFilter === tag ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>#{tag}</button>)}
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-900"><Users className="w-4 h-4 text-emerald-500" /><h3 className="text-xs font-bold uppercase tracking-wider text-white">Vista social</h3></div>
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer"><input type="checkbox" checked={onlyFriends} onChange={e => setOnlyFriends(e.target.checked)} className="accent-red-600" />Ver solo publicaciones de amigos</label>
            <p className="text-[11px] text-neutral-500 mt-3">Si todavía no tienes amigos agregados, esta vista puede aparecer vacía.</p>
          </div>

          <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-850 rounded-xl p-4">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">Comunidad real</span>
            <ul className="text-[11px] text-neutral-400 space-y-1.5 list-disc pl-3 font-light">
              <li>Las publicaciones salen de registros reales.</li>
              <li>Las fotos se suben como archivos al backend.</li>
              <li>Usa etiquetas para clasificar progreso, nutrición, fuerza o retos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};