import PulseHeart from '@/components/PulseHeart'

function FavoriteButton({ liked, onChange, label, size = 42, className = '' }) {
  return (
    <PulseHeart
      liked={liked}
      onChange={onChange}
      showCount={false}
      label={label || (liked ? 'Remove from favourites' : 'Add to favourites')}
      size={size}
      pillColor="transparent"
      likedColor="#d946ef"
      idleColor="#78716c"
      className={className}
    />
  )
}

export default FavoriteButton
