# HeyGen Avatar Pricing Guide

## Quick Answer: Cost for 1 Minute of Speech

For **1 minute of avatar speech** using HeyGen:

### Video Generation API (Pre-recorded)
- **Free Plan**: 0.2 credits (free, up to 50 minutes/month)
- **Pro Plan ($99/month)**: 0.2 credits = ~$0.20 per minute
- **Scale Plan ($330/month)**: 0.2 credits = ~$0.10 per minute

### Streaming API (Real-time) ⚠️
- **Pricing may differ** from video generation
- Check HeyGen's official pricing for current streaming rates
- Typically charged per minute of streaming time

## Detailed Pricing Breakdown

### Free Plan
- **Monthly Cost**: $0
- **Credits**: 10 API credits/month
- **Credit to Video Ratio**: 1 credit = 5 minutes of video
- **1 Minute Cost**: 0.2 credits
- **Monthly Limit**: ~50 minutes of video (free)

### Pro Plan
- **Monthly Cost**: $99
- **Credits**: 100 API credits/month
- **Credit to Video Ratio**: 1 credit = 5 minutes of video
- **1 Minute Cost**: 0.2 credits
- **Monthly Limit**: ~500 minutes of video
- **Cost per Minute**: ~$0.20 (if using all credits)

### Scale Plan
- **Monthly Cost**: $330
- **Credits**: 660 API credits/month
- **Credit to Video Ratio**: 1 credit = 5 minutes of video
- **1 Minute Cost**: 0.2 credits
- **Monthly Limit**: ~3,300 minutes of video
- **Cost per Minute**: ~$0.10 (if using all credits)

## Real-World Cost Examples

### Example 1: Light Usage (2 minutes/day)
- **Monthly Usage**: 60 minutes
- **Credits Needed**: 12 credits
- **Free Plan**: ❌ Not enough (only 10 credits)
- **Pro Plan**: $99/month
- **Effective Cost**: $1.65 per minute

### Example 2: Medium Usage (5 minutes/day)
- **Monthly Usage**: 150 minutes
- **Credits Needed**: 30 credits
- **Free Plan**: ❌ Not enough
- **Pro Plan**: $99/month
- **Effective Cost**: $0.66 per minute

### Example 3: Heavy Usage (10 minutes/day)
- **Monthly Usage**: 300 minutes
- **Credits Needed**: 60 credits
- **Free Plan**: ❌ Not enough
- **Pro Plan**: $99/month
- **Effective Cost**: $0.33 per minute

### Example 4: Very Heavy Usage (30 minutes/day)
- **Monthly Usage**: 900 minutes
- **Credits Needed**: 180 credits
- **Free Plan**: ❌ Not enough
- **Pro Plan**: ❌ Not enough (only 100 credits)
- **Scale Plan**: $330/month
- **Effective Cost**: $0.37 per minute

## Streaming API vs Video Generation API

### Video Generation API
- **Use Case**: Pre-recorded videos
- **Pricing**: Based on credits (1 credit = 5 minutes)
- **Best For**: Static content, batch processing
- **Cost**: As shown above

### Streaming API (Real-time)
- **Use Case**: Real-time text-to-speech (what we're using)
- **Pricing**: May differ from video generation
- **Best For**: Interactive applications, live conversations
- **Cost**: Check HeyGen's official pricing page

**⚠️ Important**: Streaming API pricing may be different. Contact HeyGen or check their pricing page for current streaming rates.

## Cost Optimization Strategies

1. **Start with Free Plan**: Test your application with the free tier
2. **Batch Processing**: Group multiple text snippets into longer sessions
3. **Cache Common Responses**: Cache frequently used audio/text
4. **Monitor Usage**: Track API usage to avoid surprises
5. **Consider Alternatives**: 
   - Use pre-generated videos for static content
   - Use TTS services for audio-only needs
   - Combine with other services for cost efficiency

## When to Use Each Plan

### Free Plan ✅
- Testing and development
- Low-volume applications (< 50 minutes/month)
- Prototyping and demos

### Pro Plan ✅
- Production applications
- Moderate usage (50-500 minutes/month)
- Small to medium businesses

### Scale Plan ✅
- High-volume applications
- Heavy usage (500+ minutes/month)
- Enterprise applications
- Need for Video Translation API and Proofreading API

## Additional Costs to Consider

1. **Avatar Creation**: Creating custom avatars may have additional costs
2. **Voice Cloning**: Advanced voice features may cost extra
3. **API Rate Limits**: Higher tiers may have better rate limits
4. **Support**: Enterprise plans may include better support

## Getting Accurate Pricing

1. **Check HeyGen Website**: Visit [heygen.com/pricing](https://www.heygen.com/pricing)
2. **Contact Sales**: For enterprise pricing, contact HeyGen sales
3. **API Documentation**: Check [docs.heygen.com](https://docs.heygen.com/) for current rates
4. **Dashboard**: Check your HeyGen dashboard for usage and billing

## Resources

- [HeyGen Pricing Page](https://www.heygen.com/pricing)
- [HeyGen API Pricing Guide](https://help.heygen.com/en/articles/10060327-heygen-api-pricing-subscriptions-explained)
- [HeyGen API Documentation](https://docs.heygen.com/)
- [HeyGen Dashboard](https://app.heygen.com/)

## Notes

- Prices are subject to change
- Streaming API pricing may differ from video generation
- Credits don't roll over (use them or lose them)
- Check HeyGen's official pricing for the most current information
- Enterprise pricing may be available for high-volume usage

